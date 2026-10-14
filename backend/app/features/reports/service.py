from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError, RateLimitedError
from app.features.audit.service import record_event
from app.features.identity.models import User, utcnow
from app.features.moderation import service as moderation_service
from app.features.opportunities import repository as opp_repo
from app.features.reports.models import URGENT_CATEGORIES, Report
from app.features.reports.schemas import (
    ReportCreate,
    ReportDecision,
    ReportReceipt,
    ReportView,
)
from app.features.sessions import repository as session_repo
from app.features.sessions import service as session_service

#: First-decision targets (spec R45): urgent same day, routine 48 hours.
URGENT_TARGET_HOURS = 24
ROUTINE_TARGET_HOURS = 48

_PUBLIC_OPPORTUNITY_STATUSES = ("approved", "expired")


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def fingerprint(client_host: str | None, user: User | None) -> str:
    """Salted, one-way hash used only to rate-limit reports. No raw IP is stored."""
    secret = get_settings().report_hash_secret
    raw = f"{secret}|{client_host or 'unknown'}|{user.id if user else ''}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def _target_title(db: AsyncSession, target_type: str, target_id) -> str | None:
    """Title of a publicly visible target, or None when it can't be reported."""
    if target_type == "opportunity":
        opp = await opp_repo.get_opportunity(db, target_id)
        if opp is None or opp.status not in _PUBLIC_OPPORTUNITY_STATUSES:
            return None
        return opp.title
    session = await session_repo.get_session(db, target_id)
    if session is None or session.status != "approved":
        return None
    return session.topic


async def create_report(
    db: AsyncSession,
    *,
    user: User | None,
    client_host: str | None,
    payload: ReportCreate,
) -> ReportReceipt:
    if await _target_title(db, payload.target_type, payload.target_id) is None:
        raise NotFoundError("That listing could not be found.")

    fp = fingerprint(client_host, user)
    since = utcnow() - timedelta(hours=1)
    recent = await db.scalar(
        select(func.count())
        .select_from(Report)
        .where(Report.reporter_fingerprint == fp, Report.created_at >= since)
    )
    if (recent or 0) >= get_settings().report_rate_limit_per_hour:
        raise RateLimitedError("You have sent several reports. Please try again later.")

    report = Report(
        target_type=payload.target_type,
        target_id=payload.target_id,
        category=payload.category,
        details=(payload.details or "").strip() or None,
        urgent=payload.category in URGENT_CATEGORIES,
        status="open",
        reporter_user_id=user.id if user else None,
        reporter_fingerprint=fp,
    )
    db.add(report)
    await db.flush()
    await record_event(
        db,
        action="report.created",
        actor_user_id=user.id if user else None,
        target_type=payload.target_type,
        target_id=payload.target_id,
        metadata={"category": payload.category, "urgent": report.urgent},
    )
    await db.commit()
    message = (
        "Thank you. Safety and fraud reports are reviewed the same day."
        if report.urgent
        else "Thank you. Our team reviews reports within 48 hours."
    )
    return ReportReceipt(id=report.id, message=message)


async def _view(db: AsyncSession, report: Report, now: datetime) -> ReportView:
    age_hours = int((now - _as_aware(report.created_at)).total_seconds() // 3600)
    target = URGENT_TARGET_HOURS if report.urgent else ROUTINE_TARGET_HOURS
    title = None
    if report.target_type == "opportunity":
        opp = await opp_repo.get_opportunity(db, report.target_id)
        title = opp.title if opp else None
    else:
        session = await session_repo.get_session(db, report.target_id)
        title = session.topic if session else None
    return ReportView(
        id=report.id,
        target_type=report.target_type,
        target_id=report.target_id,
        target_title=title or "Removed listing",
        category=report.category,
        details=report.details,
        urgent=report.urgent,
        status=report.status,
        age_hours=age_hours,
        overdue=report.status == "open" and age_hours >= target,
        signed_in_reporter=report.reporter_user_id is not None,
        resolution=report.resolution,
        resolution_note=report.resolution_note,
        created_at=report.created_at,
    )


async def open_reports(db: AsyncSession) -> list[ReportView]:
    """Open reports, urgent first, then oldest first (spec R45 queue order)."""
    result = await db.execute(
        select(Report)
        .where(Report.status == "open")
        .order_by(Report.urgent.desc(), Report.created_at)
    )
    now = utcnow()
    return [await _view(db, r, now) for r in result.scalars().all()]


async def decide_report(
    db: AsyncSession,
    *,
    admin: User,
    report_id: uuid.UUID,
    payload: ReportDecision,
) -> ReportView:
    report = await db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report not found.")
    if report.status != "open":
        raise ConflictError("This report has already been handled.")

    report.status = "dismissed" if payload.action == "dismiss" else "resolved"
    report.resolution = {"resolve": "resolved", "dismiss": "dismissed"}.get(
        payload.action, "target_suspended"
    )
    report.resolution_note = payload.note.strip()
    report.resolved_by_user_id = admin.id
    report.resolved_at = utcnow()
    await record_event(
        db,
        action=f"report.{report.resolution}",
        actor_user_id=admin.id,
        target_type="report",
        target_id=report.id,
        metadata={"category": report.category},
    )

    if payload.action == "suspend_target":
        # Suspension is immediate and audited by the moderation services,
        # which also commit the report decision above.
        if report.target_type == "opportunity":
            await moderation_service.decide_listing(
                db,
                admin=admin,
                opportunity_id=report.target_id,
                decision="suspend",
                reason=f"Report: {payload.note.strip()}",
            )
        else:
            await session_service.decide_session(
                db,
                admin=admin,
                session_id=report.target_id,
                decision="suspend",
                reason=f"Report: {payload.note.strip()}",
            )
    else:
        await db.commit()

    await db.refresh(report)
    return await _view(db, report, utcnow())
