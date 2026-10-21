from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal
from app.features.identity import repository as identity_repo
from app.features.identity.models import User
from app.features.opportunities.models import Opportunity
from app.features.providers.models import Organization, ProviderMembership
from app.features.sessions.models import ApplicationSupportSession

NOW = datetime.now(UTC)


async def ensure_user(db: AsyncSession, email: str) -> User:
    user = await identity_repo.get_user_by_email(db, email)
    if user is None:
        user = await identity_repo.create_user(
            db, email=email, email_verified_at=NOW
        )
    await identity_repo.ensure_role(db, user.id, "provider")
    return user


async def ensure_org(
    db: AsyncSession,
    *,
    name: str,
    provider_type: str,
    public_contact: str,
    operating_area: str,
) -> Organization:
    result = await db.execute(select(Organization).where(Organization.name == name))
    org = result.scalar_one_or_none()
    if org is not None:
        return org
    org = Organization(
        name=name,
        provider_type=provider_type,
        public_contact=public_contact,
        operating_area=operating_area,
        verification_status="verified",
        verified_at=NOW,
    )
    db.add(org)
    await db.flush()
    return org


async def ensure_membership(
    db: AsyncSession, *, org: Organization, user: User
) -> None:
    result = await db.execute(
        select(ProviderMembership).where(
            ProviderMembership.organization_id == org.id,
            ProviderMembership.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        db.add(
            ProviderMembership(
                organization_id=org.id,
                user_id=user.id,
                role="owner",
                status="active",
            )
        )


def _aware(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=UTC)


async def ensure_listing(
    db: AsyncSession, *, org: Organization, user: User, data: dict
) -> None:
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.organization_id == org.id,
            Opportunity.title == data["title"],
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        # Keep the demo alive: a listing meant to be open whose deadline has
        # passed gets its deadline moved forward again. Listings staff have
        # suspended or rejected are left alone.
        deadline = _aware(existing.deadline_at)
        if (
            data.get("status") == "approved"
            and existing.status in ("approved", "expired")
            and deadline is not None
            and deadline < NOW
        ):
            existing.status = "approved"
            existing.deadline_at = data["deadline_at"]
            existing.published_at = NOW - timedelta(hours=12)
        return
    db.add(
        Opportunity(
            organization_id=org.id,
            created_by_user_id=user.id,
            **data,
        )
    )


async def ensure_session(
    db: AsyncSession, *, org: Organization, user: User, data: dict
) -> bool:
    """Create an approved demo session once; return True when created."""
    existing = await db.scalar(
        select(ApplicationSupportSession).where(
            ApplicationSupportSession.organization_id == org.id,
            ApplicationSupportSession.topic == data["topic"],
        )
    )
    if existing is not None:
        # A demo session that already happened is moved to its future date.
        if existing.status == "approved" and _aware(existing.ends_at) < NOW:
            existing.starts_at = data["starts_at"]
            existing.ends_at = data["ends_at"]
        return False
    db.add(
        ApplicationSupportSession(
            organization_id=org.id,
            created_by_user_id=user.id,
            status="approved",
            submitted_at=NOW - timedelta(days=2),
            reviewed_at=NOW - timedelta(days=1),
            **data,
        )
    )
    return True


def approved(**overrides) -> dict:
    base = {
        "status": "approved",
        "submitted_at": NOW - timedelta(days=2),
        "reviewed_at": NOW - timedelta(days=1),
        "published_at": NOW - timedelta(hours=12),
    }
    base.update(overrides)
    return base


DEMO = [
    {
        "email": "provider@awgu.local",
        "org": {
            "name": "Awgu Skills Centre",
            "provider_type": "training_provider",
            "public_contact": "hello@awgu-skills.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="apprenticeship",
                title="Solar installation apprenticeship",
                description=(
                    "Learn to install and maintain solar panels with a local "
                    "technician. Hands-on, paid stipend, no prior experience "
                    "needed."
                ),
                eligibility="Aged 18-30, resident in Awgu LGA.",
                cost_details="Free to join.",
                pay_details="Monthly stipend of N30,000 during training.",
                location="Awgu",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=6),
                published_at=NOW - timedelta(hours=6),
            ),
            approved(
                opportunity_type="training",
                title="Basic computer skills training",
                description=(
                    "Four-week introduction to computers, typing, and the "
                    "internet. Certificate on completion."
                ),
                cost_details="N2,000 materials fee.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=45),
            ),
        ],
        "sessions": [
            {
                "topic": "Application help desk: forms and documents",
                "description": (
                    "Drop in for help filling application forms, checking which "
                    "documents a listing really needs, and spotting fee scams."
                ),
                "starts_at": NOW + timedelta(days=5, hours=2),
                "ends_at": NOW + timedelta(days=5, hours=5),
                "delivery_mode": "onsite",
                "location": "Awgu Skills Centre, main hall",
                "capacity": 25,
                "accessibility_notes": "Step-free entrance. Seating provided.",
                "organizer_contact": "hello@awgu-skills.test",
            },
            {
                "topic": "Writing a strong scholarship essay (online)",
                "description": (
                    "A short online workshop on planning and editing a "
                    "scholarship essay, with time for questions."
                ),
                "starts_at": NOW + timedelta(days=12, hours=1),
                "ends_at": NOW + timedelta(days=12, hours=2),
                "delivery_mode": "remote",
                "location": "Online video call (link sent after registering)",
                "capacity": 2,
                "accessibility_notes": "Captions on; works on low data.",
                "organizer_contact": "hello@awgu-skills.test",
            },
        ],
    },
    {
        "email": "scholar@awgu.local",
        "org": {
            "name": "Enugu State Education Trust",
            "provider_type": "public_program",
            "public_contact": "scholarships@enugu-edu.test",
            "operating_area": "Enugu State",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="State secondary scholarship 2026",
                description=(
                    "Full tuition support for high-performing secondary school "
                    "students across Enugu State."
                ),
                eligibility="JSS3 or SSS1 students with strong results.",
                cost_details="No cost to apply.",
                pay_details="Tuition and book allowance covered.",
                location="Enugu North",
                delivery_mode="hybrid",
                application_route="external",
                external_url="https://example.test/enugu-scholarship",
                deadline_at=NOW + timedelta(days=30),
                published_at=NOW - timedelta(hours=20),
            ),
            {
                "status": "expired",
                "opportunity_type": "scholarship",
                "title": "Undergraduate bursary award",
                "description": (
                    "A one-off bursary for undergraduate students from Enugu "
                    "State. This round has closed."
                ),
                "location": "Enugu",
                "delivery_mode": "remote",
                "application_route": "platform",
                "cost_details": "No cost to apply.",
                "pay_details": "One-off N50,000 bursary.",
                "deadline_at": NOW - timedelta(days=3),
                "submitted_at": NOW - timedelta(days=40),
                "reviewed_at": NOW - timedelta(days=35),
                "published_at": NOW - timedelta(days=35),
            },
        ],
    },
    {
        "email": "trader@awgu.local",
        "org": {
            "name": "Awgu Market Traders Union",
            "provider_type": "sme",
            "public_contact": "union@awgu-market.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="local_work",
                title="Market stall construction - paid day work",
                description=(
                    "Short-term paid work helping build new market stalls. "
                    "Adults only. Tools and safety gear provided."
                ),
                eligibility="Adults 18+, physically able to do light construction.",
                pay_details="N8,000 per day, paid daily.",
                location="Awgu",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=20),
            ),
            approved(
                opportunity_type="employment",
                title="Shop assistant (entry level)",
                description=(
                    "Support a busy provisions shop: stocking, customer "
                    "service, and simple record keeping."
                ),
                eligibility="School leavers welcome. Basic literacy required.",
                pay_details="N40,000 per month.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=60),
            ),
        ],
    },
    {
        "email": "tailor@awgu.local",
        "org": {
            "name": "Nenwe Women's Tailoring Cooperative",
            "provider_type": "ngo",
            "public_contact": "coop@nenwe-tailoring.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="apprenticeship",
                title="Tailoring and fashion design apprenticeship",
                description=(
                    "Six months learning to cut, sew and finish clothes with "
                    "experienced tailors. Ends with your own small portfolio."
                ),
                eligibility="Aged 18-30. No experience needed.",
                cost_details="Free. Sewing machines provided during training.",
                location="Nenwe",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=21),
            ),
            approved(
                opportunity_type="training",
                title="Weekend bead-making and small business class",
                description=(
                    "Four Saturdays: make and price bead jewellery, keep simple "
                    "records and sell at the market."
                ),
                cost_details="N1,500 for materials.",
                location="Nenwe",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=14),
            ),
            approved(
                opportunity_type="local_work",
                title="Festival setup helpers - paid day work",
                description=(
                    "Help set up tents, chairs and stalls for the cooperative's "
                    "harvest festival. Adults only."
                ),
                eligibility="Adults 18+.",
                pay_details="N6,000 per day, paid at the end of each day.",
                location="Nenwe",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=9),
            ),
        ],
        "sessions": [
            {
                "topic": "CV and interview practice for first jobs",
                "description": (
                    "Write a one-page CV and practise common interview "
                    "questions in a friendly group."
                ),
                "starts_at": NOW + timedelta(days=8, hours=3),
                "ends_at": NOW + timedelta(days=8, hours=5),
                "delivery_mode": "onsite",
                "location": "Nenwe Town Hall",
                "capacity": 30,
                "accessibility_notes": "Ground floor. Bring a pen if you can.",
                "organizer_contact": "coop@nenwe-tailoring.test",
            },
        ],
    },
    {
        "email": "clinic@awgu.local",
        "org": {
            "name": "Mgbowo Community Health Centre",
            "provider_type": "organization",
            "public_contact": "info@mgbowo-health.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="employment",
                title="Health records assistant (entry level)",
                description=(
                    "Keep patient appointment records tidy and help at the "
                    "front desk. Training given."
                ),
                eligibility="SSCE or equivalent. Good with people.",
                pay_details="N55,000 per month.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=25),
            ),
            approved(
                opportunity_type="training",
                title="First aid and community health volunteer course",
                description=(
                    "Learn first aid, basic hygiene education and when to refer "
                    "someone to a clinic. Certificate on completion."
                ),
                cost_details="Free.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=18),
            ),
        ],
    },
    {
        "email": "tech@awgu.local",
        "org": {
            "name": "Enugu Tech Hub Youth Programme",
            "provider_type": "training_provider",
            "public_contact": "youth@enugu-techhub.test",
            "operating_area": "Enugu State",
        },
        "listings": [
            approved(
                opportunity_type="training",
                title="Online coding bootcamp for beginners",
                description=(
                    "Eight weeks of evening classes in web basics (HTML, CSS, "
                    "JavaScript). Works on a phone or laptop, low data."
                ),
                cost_details="Free.",
                location="Enugu",
                delivery_mode="remote",
                application_route="external",
                external_url="https://example.test/enugu-coding-bootcamp",
                deadline_at=NOW + timedelta(days=40),
            ),
            approved(
                opportunity_type="training",
                title="Digital marketing for small businesses (online)",
                description=(
                    "Use WhatsApp, Instagram and simple ads to sell more. Short "
                    "lessons with a free certificate."
                ),
                cost_details="Free.",
                location="Enugu",
                delivery_mode="remote",
                application_route="platform",
                deadline_at=NOW + timedelta(days=28),
            ),
            approved(
                opportunity_type="apprenticeship",
                title="Phone and laptop repair apprenticeship",
                description=(
                    "Learn screen, battery and charging-port repairs in a busy "
                    "workshop, then take small jobs yourself."
                ),
                eligibility="Aged 18-28.",
                pay_details="Stipend of N25,000 per month.",
                location="Enugu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=35),
            ),
            approved(
                opportunity_type="employment",
                title="Customer support agent (remote, part-time)",
                description=(
                    "Answer customer messages for an Enugu online shop, four "
                    "hours a day from home."
                ),
                eligibility="Good written English. Own a smartphone.",
                pay_details="N45,000 per month.",
                location="Enugu",
                delivery_mode="remote",
                application_route="external",
                external_url="https://example.test/support-agent",
                deadline_at=NOW + timedelta(days=15),
            ),
        ],
        "sessions": [
            {
                "topic": "Spotting fake job and scholarship offers online",
                "description": (
                    "Learn the warning signs of scams, including anyone asking "
                    "for a fee to apply, and where to report them."
                ),
                "starts_at": NOW + timedelta(days=4, hours=4),
                "ends_at": NOW + timedelta(days=4, hours=5),
                "delivery_mode": "remote",
                "location": "Online video call (link sent after registering)",
                "capacity": 100,
                "accessibility_notes": "Captions on; audio-only works too.",
                "organizer_contact": "youth@enugu-techhub.test",
            },
        ],
    },
    {
        "email": "farm@awgu.local",
        "org": {
            "name": "Awgu Farmers' Cooperative",
            "provider_type": "sme",
            "public_contact": "farmers@awgu-coop.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="local_work",
                title="Cashew harvest - paid seasonal work",
                description=(
                    "Pick and sort cashew on cooperative farms for three weeks. "
                    "Adults only. Water and shade breaks every two hours."
                ),
                eligibility="Adults 18+.",
                pay_details="N7,000 per day, paid weekly.",
                location="Ugbo",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=12),
            ),
            approved(
                opportunity_type="apprenticeship",
                title="Poultry farming apprenticeship",
                description=(
                    "Learn to raise chickens for eggs and meat: feeding, "
                    "vaccination, hygiene and selling."
                ),
                eligibility="Aged 18-30, living in Awgu LGA.",
                pay_details="Stipend of N20,000 per month.",
                location="Ihe",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=30),
            ),
            approved(
                opportunity_type="training",
                title="Fish farming starter course",
                description=(
                    "Two-week practical course on setting up a small fish pond "
                    "and caring for catfish."
                ),
                cost_details="N3,000 for materials.",
                location="Awgu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=22),
            ),
        ],
    },
    {
        "email": "bursary@awgu.local",
        "org": {
            "name": "Awgu Diocesan Schools Bursary Fund",
            "provider_type": "school",
            "public_contact": "bursary@awgu-schools.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="WAEC exam fee support 2026",
                description=(
                    "Pays the WAEC registration fee for students in Awgu LGA "
                    "who can't afford it."
                ),
                eligibility="SSS3 students in a school in Awgu LGA.",
                cost_details="No cost to apply.",
                pay_details="Full WAEC registration fee paid to your school.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=5),
            ),
            approved(
                opportunity_type="scholarship",
                title="Girls in STEM university bursary",
                description=(
                    "Yearly support for young women from Enugu State studying "
                    "science, technology, engineering or maths."
                ),
                eligibility="Female undergraduates in a STEM course.",
                cost_details="No cost to apply.",
                pay_details="N150,000 per year.",
                location="Enugu",
                delivery_mode="remote",
                application_route="external",
                external_url="https://example.test/girls-in-stem",
                deadline_at=NOW + timedelta(days=50),
            ),
        ],
    },
]


async def seed_demo() -> None:
    async with SessionLocal() as db:
        created_orgs = 0
        created_listings = 0
        created_sessions = 0
        for entry in DEMO:
            user = await ensure_user(db, entry["email"])
            org_existed = await db.scalar(
                select(Organization.id).where(
                    Organization.name == entry["org"]["name"]
                )
            )
            org = await ensure_org(db, **entry["org"])
            if org_existed is None:
                created_orgs += 1
            await ensure_membership(db, org=org, user=user)
            for data in entry["listings"]:
                title = data["title"]
                exists = await db.scalar(
                    select(Opportunity.id).where(
                        Opportunity.organization_id == org.id,
                        Opportunity.title == title,
                    )
                )
                await ensure_listing(db, org=org, user=user, data=data)
                if exists is None:
                    created_listings += 1
            for data in entry.get("sessions", []):
                if await ensure_session(db, org=org, user=user, data=data):
                    created_sessions += 1

        await db.commit()
        print(
            f"Demo seed complete: {created_orgs} provider(s), "
            f"{created_listings} listing(s) and {created_sessions} session(s) "
            "created."
        )


if __name__ == "__main__":
    asyncio.run(seed_demo())
