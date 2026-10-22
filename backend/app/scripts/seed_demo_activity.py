"""Synthetic demo activity for the staff impact dashboard (DECISIONS D32).

Creates made-up applicants (emails end in @demo.awgu.local), their saved
listings, applications and session sign-ups, spread over the last eight
weeks. The dashboard detects these accounts and labels its figures as
including demo data. Run after `seed` and `seed_demo`; it does nothing if the
demo applicants already exist. Never run against real users' data.
"""

from __future__ import annotations

import asyncio
import random
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.features.applicant.models import ApplicantProfile, SavedOpportunity
from app.features.applicant.service import age_band_for
from app.features.applications.models import Application, ApplicationStatusEvent
from app.features.identity import repository as identity_repo
from app.features.identity.models import User
from app.features.impact.service import DEMO_EMAIL_DOMAIN
from app.features.opportunities.models import Opportunity
from app.features.sessions.models import ApplicationSupportSession, SessionRegistration

APPLICANTS = 40

FIRST_NAMES = (
    "Chidera",
    "Ifeanyi",
    "Ngozi",
    "Chukwuemeka",
    "Amarachi",
    "Obinna",
    "Chiamaka",
    "Uchenna",
    "Adaeze",
    "Kelechi",
    "Ebuka",
    "Nneka",
    "Somto",
    "Ugochi",
    "Chinedu",
    "Oluchi",
    "Ikenna",
    "Chioma",
    "Nnamdi",
    "Ezinne",
)

# (community, LGA): most applicants from Awgu's towns, some from nearby LGAs.
PLACES = (
    ("Mgbowo", "Awgu"),
    ("Mgbowo", "Awgu"),
    ("Nenwe", "Aninri"),
    ("Awgu", "Awgu"),
    ("Awgu", "Awgu"),
    ("Mmaku", "Awgu"),
    ("Owelli", "Awgu"),
    ("Obeagu", "Awgu"),
    ("Agbogugu", "Awgu"),
    ("Ugbo", "Awgu"),
    ("Ihe", "Awgu"),
    ("Ezere", "Awgu"),
    ("Oji River", "Oji River"),
    ("Enugu", "Enugu North"),
)

PLATFORM_PATH = (
    "submitted",
    "submitted",
    "under_review",
    "interview",
    "offered",
    "accepted",
)
TRACKED_PATH = ("started", "started", "submitted", "submitted", "interview", "accepted")


async def seed_demo_activity() -> None:
    rng = random.Random(2026)  # Same data on every machine.
    now = datetime.now(UTC)
    async with SessionLocal() as db:
        already = await db.scalar(
            select(User.id).where(User.email.like(f"%{DEMO_EMAIL_DOMAIN}")).limit(1)
        )
        if already is not None:
            print("Demo activity already present; nothing to do.")
            return

        listings = list(
            (
                await db.scalars(
                    select(Opportunity).where(Opportunity.status == "approved")
                )
            ).all()
        )
        sessions = list(
            (
                await db.scalars(
                    select(ApplicationSupportSession).where(
                        ApplicationSupportSession.status == "approved"
                    )
                )
            ).all()
        )
        if not listings:
            print("No approved listings yet; run seed_demo first.")
            return

        taken = dict(
            (
                await db.execute(
                    select(SessionRegistration.session_id, func.count())
                    .where(SessionRegistration.status == "registered")
                    .group_by(SessionRegistration.session_id)
                )
            ).all()
        )
        places_left = {s.id: s.capacity - taken.get(s.id, 0) for s in sessions}

        applications = 0
        for n in range(APPLICANTS):
            first = FIRST_NAMES[n % len(FIRST_NAMES)]
            user = await identity_repo.create_user(
                db,
                email=f"{first.lower()}.{n + 1}{DEMO_EMAIL_DOMAIN}",
                email_verified_at=now,
            )
            await identity_repo.ensure_role(db, user.id, "applicant")
            dob = date(now.year - rng.randint(18, 30), rng.randint(1, 12), 1)
            band, minor = age_band_for(dob)
            community, lga = rng.choice(PLACES)
            db.add(
                ApplicantProfile(
                    user_id=user.id,
                    preferred_name=first,
                    date_of_birth=dob,
                    age_band=band,
                    is_minor=minor,
                    lga=lga,
                    community=community,
                )
            )

            picks = rng.sample(listings, k=min(len(listings), rng.randint(1, 4)))
            for listing in picks[:2]:
                db.add(SavedOpportunity(user_id=user.id, opportunity_id=listing.id))
            for listing in picks[: rng.randint(0, 3)]:
                platform = listing.application_route == "platform"
                status = rng.choice(PLATFORM_PATH if platform else TRACKED_PATH)
                created = now - timedelta(
                    days=rng.randint(0, 55), hours=rng.randint(0, 23)
                )
                application = Application(
                    applicant_user_id=user.id,
                    opportunity_id=listing.id,
                    route=listing.application_route,
                    status=status,
                    status_source="applicant",
                    submitted_at=created if status != "started" else None,
                    created_at=created,
                    updated_at=created,
                )
                db.add(application)
                await db.flush()
                db.add(
                    ApplicationStatusEvent(
                        application_id=application.id,
                        to_status=status,
                        source="applicant",
                        created_at=created,
                    )
                )
                applications += 1

            # Sign up for a session, never past its capacity (the real
            # registration flow enforces the same limit).
            open_sessions = [s for s in sessions if places_left[s.id] > 0]
            if open_sessions and rng.random() < 0.45:
                session = rng.choice(open_sessions)
                db.add(SessionRegistration(session_id=session.id, user_id=user.id))
                places_left[session.id] -= 1

        await db.commit()
        print(
            f"Demo activity: {APPLICANTS} synthetic applicants and "
            f"{applications} applications created."
        )


if __name__ == "__main__":
    asyncio.run(seed_demo_activity())
