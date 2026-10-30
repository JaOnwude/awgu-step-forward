"""Your data rights (NDPA 2023): download a copy, or delete your account.

The download holds every row we store about the signed-in person, as JSON.
Secrets (password and token hashes) are left out. Deleting an account
removes the user row; the database's foreign keys then delete everything
tied to it (profile, saved listings, applications, sessions, notifications,
picture) and unlink shared records such as audit events and reports.
"""

from __future__ import annotations

import base64
import json
import uuid
from datetime import UTC, date, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.config import get_settings
from app.core.errors import ConflictError, PermissionDeniedError
from app.core.roles import STAFF_ROLES
from app.db.base import Base
from app.db.session import get_db
from app.features.applicant.models import ApplicantProfile, SavedOpportunity
from app.features.applications.models import (
    Application,
    ApplicationAnswer,
    ApplicationStatusEvent,
)
from app.features.audit.service import record_event
from app.features.identity.models import (
    OtpChallenge,
    User,
    UserAvatar,
    UserRole,
    UserSession,
)
from app.features.identity.schemas import MessageResponse
from app.features.notifications.models import Notification, NotificationPreference
from app.features.opportunities.models import Opportunity
from app.features.providers.models import Organization, ProviderMembership
from app.features.reports.models import Report
from app.features.sessions.models import (
    ApplicationSupportSession,
    SessionRegistration,
)

_settings = get_settings()
router = APIRouter(prefix="/me", tags=["your data"])

# Never exported: hashes that would only help someone break into the account,
# and the salted reporter fingerprint used to limit report spam.
_SECRET_COLUMNS = {
    "password_hash",
    "token_hash",
    "csrf_token_hash",
    "code_hash",
    "reporter_fingerprint",
}


def _plain(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _row(obj: Base, **extra: Any) -> dict[str, Any]:
    data = {
        column.name: _plain(getattr(obj, column.key))
        for column in obj.__table__.columns
        if column.name not in _SECRET_COLUMNS
    }
    data.update(extra)
    return data


async def _rows(db: AsyncSession, query) -> list:
    return list((await db.execute(query)).scalars().all())


async def build_export(db: AsyncSession, user: User) -> dict[str, Any]:
    uid = user.id
    profile = await db.scalar(
        select(ApplicantProfile).where(ApplicantProfile.user_id == uid)
    )

    saved = await _rows(
        db, select(SavedOpportunity).where(SavedOpportunity.user_id == uid)
    )
    applications = await _rows(
        db, select(Application).where(Application.applicant_user_id == uid)
    )
    app_ids = [application.id for application in applications]
    answers = (
        await _rows(
            db,
            select(ApplicationAnswer).where(
                ApplicationAnswer.application_id.in_(app_ids)
            ),
        )
        if app_ids
        else []
    )
    events = (
        await _rows(
            db,
            select(ApplicationStatusEvent).where(
                ApplicationStatusEvent.application_id.in_(app_ids)
            ),
        )
        if app_ids
        else []
    )
    opportunity_ids = {row.opportunity_id for row in [*saved, *applications]}
    titles = (
        {
            opportunity.id: opportunity.title
            for opportunity in await _rows(
                db, select(Opportunity).where(Opportunity.id.in_(opportunity_ids))
            )
        }
        if opportunity_ids
        else {}
    )

    registrations = await _rows(
        db, select(SessionRegistration).where(SessionRegistration.user_id == uid)
    )
    session_ids = {registration.session_id for registration in registrations}
    topics = (
        {
            session.id: session.topic
            for session in await _rows(
                db,
                select(ApplicationSupportSession).where(
                    ApplicationSupportSession.id.in_(session_ids)
                ),
            )
        }
        if session_ids
        else {}
    )

    memberships = await _rows(
        db, select(ProviderMembership).where(ProviderMembership.user_id == uid)
    )
    org_ids = {membership.organization_id for membership in memberships}
    org_names = (
        {
            org.id: org.name
            for org in await _rows(
                db, select(Organization).where(Organization.id.in_(org_ids))
            )
        }
        if org_ids
        else {}
    )

    preferences = await db.get(NotificationPreference, uid)
    avatar = await db.get(UserAvatar, uid)
    destinations = [value for value in (user.email, user.phone) if value]

    return {
        "about": (
            "Everything Awgu StepForward stores about your account, as of "
            "exported_at. Password and sign-in token hashes are left out for "
            "your safety."
        ),
        "exported_at": datetime.now(UTC).isoformat(),
        "account": _row(user),
        "roles": [
            _row(role)
            for role in await _rows(db, select(UserRole).where(UserRole.user_id == uid))
        ],
        "sign_in_sessions": [
            _row(session)
            for session in await _rows(
                db, select(UserSession).where(UserSession.user_id == uid)
            )
        ],
        "sign_in_codes": [
            _row(challenge)
            for challenge in await _rows(
                db,
                select(OtpChallenge).where(OtpChallenge.destination.in_(destinations)),
            )
        ]
        if destinations
        else [],
        "profile": _row(profile) if profile else None,
        "profile_picture": (
            {
                "content_type": avatar.content_type,
                "updated_at": _plain(avatar.updated_at),
                "data_base64": base64.b64encode(avatar.content).decode("ascii"),
            }
            if avatar
            else None
        ),
        "saved_opportunities": [
            _row(row, opportunity_title=titles.get(row.opportunity_id)) for row in saved
        ],
        "applications": [
            _row(row, opportunity_title=titles.get(row.opportunity_id))
            for row in applications
        ],
        "application_answers": [_row(row) for row in answers],
        "application_status_history": [_row(row) for row in events],
        "support_session_registrations": [
            _row(row, session_topic=topics.get(row.session_id)) for row in registrations
        ],
        "provider_memberships": [
            _row(row, organization_name=org_names.get(row.organization_id))
            for row in memberships
        ],
        "notification_preferences": _row(preferences) if preferences else None,
        "notifications": [
            _row(row)
            for row in await _rows(
                db, select(Notification).where(Notification.user_id == uid)
            )
        ],
        # Kept after deletion (they protect other users), but without your
        # account attached.
        "reports_you_made": [
            _row(row)
            for row in await _rows(
                db, select(Report).where(Report.reporter_user_id == uid)
            )
        ],
    }


@router.get("/export")
async def export_my_data(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> Response:
    data = await build_export(db, ctx.user)
    await record_event(
        db,
        action="account.data_exported",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=ctx.user.id,
    )
    await db.commit()
    stamp = datetime.now(UTC).strftime("%Y-%m-%d")
    return Response(
        content=json.dumps(data, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="stepforward-my-data-{stamp}.json"'
            ),
            "Cache-Control": "no-store",
        },
    )


class DeleteAccountRequest(BaseModel):
    # Typed by the person, so a stray click or script can't delete an account.
    confirm: Literal["DELETE"]


@router.delete("", response_model=MessageResponse)
async def delete_my_account(
    payload: DeleteAccountRequest,
    response: Response,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    user = ctx.user
    if set(user.role_names) & STAFF_ROLES:
        raise PermissionDeniedError(
            "Staff accounts can't be deleted here. Ask another admin to remove "
            "your staff access first.",
            code="staff_account",
        )
    manages_provider = await db.scalar(
        select(ProviderMembership.id)
        .where(ProviderMembership.user_id == user.id)
        .where(ProviderMembership.status == "active")
        .limit(1)
    )
    if manages_provider is not None:
        raise ConflictError(
            "You manage a provider organisation. Contact the StepForward team to "
            "hand it over or close it, then you can delete your account.",
            code="manages_provider",
        )

    user_id = user.id
    destinations = [value for value in (user.email, user.phone) if value]
    # The record keeps no name, email or phone: only that an account went.
    await record_event(
        db, action="account.deleted", target_type="user", target_id=user_id
    )
    if destinations:
        await db.execute(
            delete(OtpChallenge).where(
                or_(*(OtpChallenge.destination == value for value in destinations))
            )
        )
    # A plain DELETE lets the database's ON DELETE rules do the rest.
    db.expunge_all()
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()

    response.delete_cookie(_settings.session_cookie_name, path="/")
    response.delete_cookie(_settings.csrf_cookie_name, path="/")
    return MessageResponse(detail="Your account and its data have been deleted.")
