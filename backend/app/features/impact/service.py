"""Impact figures for staff and partners (spec pilot success measures).

Counts only: no names, contacts or other personal details leave this module.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.applicant.models import ApplicantProfile, SavedOpportunity
from app.features.applications.models import TRACKED_ROUTES, Application
from app.features.identity.models import User, UserRole, utcnow
from app.features.impact.schemas import (
    ApplicationStats,
    CountItem,
    ImpactStats,
    ListingStats,
    PeopleStats,
    ProviderStats,
    SessionStats,
    TrustStats,
    WeekPoint,
)
from app.features.notifications.models import Notification
from app.features.opportunities.models import OPPORTUNITY_TYPES, Opportunity
from app.features.providers.models import Organization
from app.features.reports.models import Report
from app.features.sessions.models import ApplicationSupportSession, SessionRegistration

#: Synthetic demo applicants use this email domain (scripts/seed_demo.py).
DEMO_EMAIL_DOMAIN = "@demo.awgu.local"

#: Statuses that count as a good result for the applicant.
POSITIVE_STATUSES = ("offered", "accepted", "completed")

CLOSING_SOON_DAYS = 7
WEEKS_SHOWN = 8
TOWNS_SHOWN = 8


async def _count(db: AsyncSession, model, *conditions) -> int:
    return int(
        await db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    )


def _monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _aware(value: datetime) -> datetime:
    # SQLite (tests) returns naive datetimes; Postgres returns aware ones.
    return value if value.tzinfo else value.replace(tzinfo=UTC)


async def _listing_stats(db: AsyncSession, now: datetime) -> ListingStats:
    open_now = (
        Opportunity.status == "approved",
        or_(Opportunity.deadline_at.is_(None), Opportunity.deadline_at >= now),
    )
    rows = await db.execute(
        select(Opportunity.opportunity_type, func.count())
        .where(*open_now)
        .group_by(Opportunity.opportunity_type)
    )
    counts = dict(rows.all())
    return ListingStats(
        live=await _count(db, Opportunity, *open_now),
        live_in_awgu=await _count(
            db, Opportunity, *open_now, Opportunity.location.ilike("%awgu%")
        ),
        closing_soon=await _count(
            db,
            Opportunity,
            *open_now,
            Opportunity.deadline_at <= now + timedelta(days=CLOSING_SOON_DAYS),
        ),
        pending_review=await _count(
            db, Opportunity, Opportunity.status == "pending_review"
        ),
        public_announcements=await _count(
            db, Opportunity, *open_now, Opportunity.source_url.is_not(None)
        ),
        by_category=[
            CountItem(key=kind, count=int(counts.get(kind, 0)))
            for kind in OPPORTUNITY_TYPES
        ],
    )


async def _people_stats(db: AsyncSession) -> PeopleStats:
    rows = await db.execute(
        select(ApplicantProfile.community, ApplicantProfile.lga).where(
            ApplicantProfile.community.is_not(None) | ApplicantProfile.lga.is_not(None)
        )
    )
    towns: Counter[str] = Counter()
    from_awgu = 0
    for community, lga in rows.all():
        place = (community or lga or "").strip()
        if place:
            towns[place.title()] += 1
        if "awgu" in (lga or "").lower() or "awgu" in (community or "").lower():
            from_awgu += 1
    return PeopleStats(
        applicants=await _count(db, UserRole, UserRole.role == "applicant"),
        with_profile=await _count(db, ApplicantProfile),
        from_awgu=from_awgu,
        by_town=[
            CountItem(key=town, count=n) for town, n in towns.most_common(TOWNS_SHOWN)
        ],
        saved_listings=await _count(db, SavedOpportunity),
    )


async def _application_stats(db: AsyncSession, now: datetime) -> ApplicationStats:
    started = Application.status != "draft"
    rows = await db.execute(
        select(Application.status, func.count())
        .where(started)
        .group_by(Application.status)
    )
    by_status = sorted(
        (CountItem(key=status, count=int(n)) for status, n in rows.all()),
        key=lambda item: -item.count,
    )

    # Weekly trend: bucket by Monday in Python, which works the same on
    # Postgres and on the SQLite test database.
    this_week = _monday(now.date())
    first_week = this_week - timedelta(weeks=WEEKS_SHOWN - 1)
    created = await db.scalars(
        select(Application.created_at).where(
            started,
            Application.created_at
            >= datetime.combine(first_week, datetime.min.time(), UTC),
        )
    )
    weeks: Counter[date] = Counter(_monday(_aware(value).date()) for value in created)

    return ApplicationStats(
        total=await _count(db, Application, started),
        last_30_days=await _count(
            db, Application, started, Application.created_at >= now - timedelta(days=30)
        ),
        in_platform=await _count(
            db, Application, started, Application.route == "platform"
        ),
        tracked_elsewhere=await _count(
            db, Application, started, Application.route.in_(TRACKED_ROUTES)
        ),
        positive_outcomes=await _count(
            db, Application, Application.status.in_(POSITIVE_STATUSES)
        ),
        by_status=by_status,
        weekly=[
            WeekPoint(
                week_start=first_week + timedelta(weeks=i),
                count=weeks.get(first_week + timedelta(weeks=i), 0),
            )
            for i in range(WEEKS_SHOWN)
        ],
    )


async def _session_stats(db: AsyncSession, now: datetime) -> SessionStats:
    approved = ApplicationSupportSession.status == "approved"
    return SessionStats(
        upcoming=await _count(
            db,
            ApplicationSupportSession,
            approved,
            ApplicationSupportSession.starts_at >= now,
        ),
        held=await _count(
            db,
            ApplicationSupportSession,
            approved,
            ApplicationSupportSession.ends_at < now,
        ),
        registrations=await _count(
            db, SessionRegistration, SessionRegistration.status == "registered"
        ),
        attended=await _count(
            db, SessionRegistration, SessionRegistration.attendance == "attended"
        ),
    )


async def impact_stats(db: AsyncSession) -> ImpactStats:
    now = utcnow()
    return ImpactStats(
        generated_at=now,
        includes_demo_data=await _count(
            db, User, User.email.like(f"%{DEMO_EMAIL_DOMAIN}")
        )
        > 0,
        listings=await _listing_stats(db, now),
        providers=ProviderStats(
            verified=await _count(
                db, Organization, Organization.verification_status == "verified"
            ),
            pending=await _count(
                db, Organization, Organization.verification_status == "pending"
            ),
            suspended=await _count(
                db, Organization, Organization.verification_status == "suspended"
            ),
        ),
        people=await _people_stats(db),
        applications=await _application_stats(db, now),
        sessions=await _session_stats(db, now),
        trust=TrustStats(
            reports_open=await _count(db, Report, Report.status == "open"),
            reports_urgent_open=await _count(
                db, Report, Report.status == "open", Report.urgent
            ),
            reports_resolved=await _count(db, Report, Report.status == "resolved"),
            listings_suspended=await _count(
                db, Opportunity, Opportunity.status == "suspended"
            ),
            reminders_sent=await _count(
                db,
                Notification,
                Notification.status == "sent",
                Notification.purpose.in_(("deadline_reminder", "session_reminder")),
            ),
        ),
    )
