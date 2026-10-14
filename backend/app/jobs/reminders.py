"""Deadline and support-session reminders (spec R34/R36).

Run on a schedule in production (one scheduler, not one per API replica —
TRD §8). In week 1 it runs by hand: `uv run python -m app.jobs.reminders`, or
from the staff workspace. Messages are deduplicated per channel, and their
wording stays neutral because phones are often shared (R37).
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.features.applicant.models import SavedOpportunity
from app.features.identity.models import User, utcnow
from app.features.notifications import service as notifications
from app.features.opportunities.models import Opportunity
from app.features.sessions.models import ApplicationSupportSession, SessionRegistration

# West Africa Time has no daylight saving, so a fixed offset is exact.
WAT = timezone(timedelta(hours=1))


def _wat(value: datetime) -> str:
    aware = value if value.tzinfo else value.replace(tzinfo=UTC)
    return aware.astimezone(WAT).strftime("%a %d %b, %H:%M WAT")


async def send_deadline_reminders(db: AsyncSession, *, now: datetime) -> int:
    horizon = now + timedelta(days=get_settings().reminder_deadline_days)
    result = await db.execute(
        select(SavedOpportunity, Opportunity, User)
        .join(Opportunity, Opportunity.id == SavedOpportunity.opportunity_id)
        .join(User, User.id == SavedOpportunity.user_id)
        .where(
            Opportunity.status == "approved",
            Opportunity.deadline_at.is_not(None),
            Opportunity.deadline_at > now,
            Opportunity.deadline_at <= horizon,
        )
    )
    sent = 0
    for _saved, opp, user in result.all():
        prefs = await notifications.get_or_default(db, user.id)
        if not prefs.deadline_reminders:
            continue
        if await notifications.notify(
            db,
            user=user,
            purpose="deadline_reminder",
            dedupe_key=f"deadline:{opp.id}:{user.id}",
            subject="A saved opportunity closes soon",
            body=(
                f"“{opp.title}” closes {_wat(opp.deadline_at)}. "
                "Open StepForward to review it."
            ),
            link=f"/opportunities/{opp.id}",
        ):
            sent += 1
    return sent


async def send_session_reminders(db: AsyncSession, *, now: datetime) -> int:
    horizon = now + timedelta(hours=get_settings().reminder_session_hours)
    result = await db.execute(
        select(SessionRegistration, ApplicationSupportSession, User)
        .join(
            ApplicationSupportSession,
            ApplicationSupportSession.id == SessionRegistration.session_id,
        )
        .join(User, User.id == SessionRegistration.user_id)
        .where(
            SessionRegistration.status == "registered",
            SessionRegistration.reminder_opt_in.is_(True),
            ApplicationSupportSession.status == "approved",
            ApplicationSupportSession.starts_at > now,
            ApplicationSupportSession.starts_at <= horizon,
        )
    )
    sent = 0
    for registration, session, user in result.all():
        prefs = await notifications.get_or_default(db, user.id)
        if not prefs.session_reminders:
            continue
        if await notifications.notify(
            db,
            user=user,
            purpose="session_reminder",
            dedupe_key=f"session:{registration.id}",
            subject="Your support session is coming up",
            body=f"“{session.topic}” starts {_wat(session.starts_at)}.",
            link=f"/sessions/{session.id}",
        ):
            sent += 1
    return sent


async def run_reminders(
    db: AsyncSession, *, now: datetime | None = None
) -> tuple[int, int]:
    moment = now or utcnow()
    deadline = await send_deadline_reminders(db, now=moment)
    session = await send_session_reminders(db, now=moment)
    await db.commit()
    return deadline, session


async def run() -> tuple[int, int]:
    async with SessionLocal() as db:
        deadline, session = await run_reminders(db)
        print(f"Sent {deadline} deadline and {session} session reminder(s).")
        return deadline, session


if __name__ == "__main__":
    asyncio.run(run())
