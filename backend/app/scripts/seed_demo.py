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
    verification_status: str = "verified",
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
        verification_status=verification_status,
        verified_at=NOW if verification_status == "verified" else None,
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
        # Presentation-only fields always follow the seed, so photos and the
        # featured slot can change without wiping the database.
        existing.image_url = data.get("image_url")
        existing.is_featured = data.get("is_featured", False)
        existing.source_url = data.get("source_url")
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


def pending(**overrides) -> dict:
    """A listing waiting in the staff review queue, so moderation can be shown."""
    base = {"status": "pending_review", "submitted_at": NOW - timedelta(hours=5)}
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
                pay_details="N70,000 per month.",
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
                pay_details="N75,000 per month.",
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
    {
        "email": "carpentry@awgu.local",
        "org": {
            "name": "Mmaku Carpentry and Furniture Works",
            "provider_type": "sme",
            "public_contact": "workshop@mmaku-furniture.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="apprenticeship",
                title="Carpentry and furniture-making apprenticeship",
                description=(
                    "Learn to measure, cut, join and finish chairs, tables and "
                    "wardrobes. After a year you can take small orders yourself."
                ),
                eligibility="Aged 18-30. No experience needed.",
                cost_details="Free. Tools provided in the workshop.",
                pay_details="Stipend of N20,000 per month.",
                location="Mmaku",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=27),
            ),
            approved(
                opportunity_type="local_work",
                title="Furniture delivery helpers - paid day work",
                description=(
                    "Load and deliver furniture to customers around Awgu LGA "
                    "with the workshop's driver. Adults only."
                ),
                eligibility="Adults 18+, able to lift with a partner.",
                pay_details="N7,500 per day, paid at the end of each day.",
                location="Mmaku",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=10),
            ),
            approved(
                opportunity_type="employment",
                title="Showroom sales assistant",
                description=(
                    "Welcome customers, explain prices and delivery times, and "
                    "keep a simple sales book."
                ),
                eligibility="SSCE or equivalent. Friendly and numerate.",
                pay_details="N72,000 per month plus a small commission.",
                location="Awgu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=33),
            ),
        ],
    },
    {
        "email": "mechanics@awgu.local",
        "org": {
            "name": "Owelli Auto Mechanics Association",
            "provider_type": "organization",
            "public_contact": "secretary@owelli-mechanics.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="apprenticeship",
                title="Auto mechanic apprenticeship",
                description=(
                    "Train under a licensed mechanic: engines, brakes, "
                    "suspension and electrical faults. Freedom certificate at "
                    "the end."
                ),
                eligibility="Aged 18-28.",
                cost_details="No fee. Bring your own overalls.",
                pay_details="Stipend of N15,000 per month in year one.",
                location="Owelli",
                delivery_mode="onsite",
                application_route="in_person",
                deadline_at=NOW + timedelta(days=41),
            ),
            approved(
                opportunity_type="apprenticeship",
                title="Motorcycle and tricycle repair apprenticeship",
                description=(
                    "Six months fixing okada and keke engines, chains and "
                    "brakes at a busy roadside workshop."
                ),
                eligibility="Aged 18-30.",
                cost_details="Free.",
                pay_details="Share of repair fees after month three.",
                location="Owelli",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=19),
            ),
            approved(
                opportunity_type="training",
                title="Road safety and rider licence preparation",
                description=(
                    "Two evenings on road rules, safe riding and what you need "
                    "for a rider's licence."
                ),
                cost_details="Free.",
                location="Owelli",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=4),
            ),
        ],
        "sessions": [
            {
                "topic": "Getting your NIN and documents ready to apply",
                "description": (
                    "Bring what you have. We help you list the documents each "
                    "kind of application asks for and how to get them."
                ),
                "starts_at": NOW + timedelta(days=6, hours=3),
                "ends_at": NOW + timedelta(days=6, hours=5),
                "delivery_mode": "onsite",
                "location": "Owelli Town Hall",
                "capacity": 40,
                "accessibility_notes": "Ground floor. Interpreter for Igbo on request.",
                "organizer_contact": "secretary@owelli-mechanics.test",
            },
        ],
    },
    {
        "email": "pta@awgu.local",
        "org": {
            "name": "Obeagu Community Secondary School PTA",
            "provider_type": "school",
            "public_contact": "pta@obeagu-css.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="JAMB UTME registration support",
                description=(
                    "Covers the UTME registration fee for final-year students "
                    "who have been offered a place to sit the exam."
                ),
                eligibility="SSS3 students in a school in Awgu LGA.",
                cost_details="No cost to apply.",
                pay_details="Full UTME registration fee paid directly.",
                location="Obeagu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=16),
            ),
            approved(
                opportunity_type="scholarship",
                title="Uniform and textbook grant",
                description=(
                    "A school uniform and the core textbooks for the year for "
                    "students whose families are struggling with costs."
                ),
                eligibility="JSS1-SSS2 students in Awgu LGA.",
                cost_details="No cost to apply.",
                pay_details="Uniform and textbooks provided, worth about N35,000.",
                location="Obeagu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=24),
            ),
            approved(
                opportunity_type="local_work",
                title="Classroom painting - paid weekend work",
                description=(
                    "Paint four classrooms over two weekends. Paint, brushes and "
                    "ladders provided. Adults only."
                ),
                eligibility="Adults 18+.",
                pay_details="N8,000 per day.",
                location="Obeagu",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=7),
            ),
        ],
    },
    {
        "email": "jobs@awgu.local",
        "org": {
            "name": "Enugu Youth Jobs Network",
            "provider_type": "ngo",
            "public_contact": "hello@enugu-youthjobs.test",
            "operating_area": "Enugu State",
        },
        "listings": [
            approved(
                opportunity_type="employment",
                title="Agro-input sales representative",
                description=(
                    "Visit farmers across Awgu LGA to explain and sell seeds and "
                    "fertiliser. Motorcycle allowance included."
                ),
                eligibility="OND or SSCE. Speaks Igbo and English.",
                pay_details="N80,000 per month plus commission.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=21),
            ),
            approved(
                opportunity_type="employment",
                title="POS banking agent",
                description=(
                    "Run a mobile money and POS point in a busy market. "
                    "Training and starter float provided."
                ),
                eligibility="Aged 18+. Has a bank account and NIN.",
                pay_details="N70,000 per month plus transaction commission.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=13),
            ),
            approved(
                opportunity_type="employment",
                title="Data entry clerk (hybrid)",
                description=(
                    "Type up survey forms for a farmers' programme. Two days a "
                    "week in Enugu, the rest from home."
                ),
                eligibility="Types quickly and accurately. Owns a smartphone.",
                pay_details="N75,000 per month for a six-month contract.",
                location="Enugu",
                delivery_mode="hybrid",
                application_route="external",
                external_url="https://example.test/data-entry-clerk",
                deadline_at=NOW + timedelta(days=9),
            ),
            approved(
                opportunity_type="training",
                title="Job readiness and soft skills (online)",
                description=(
                    "Six short lessons on communication, timekeeping, teamwork "
                    "and handling customers. Free certificate."
                ),
                cost_details="Free.",
                location="Enugu",
                delivery_mode="remote",
                application_route="platform",
                deadline_at=NOW + timedelta(days=55),
            ),
            pending(
                opportunity_type="employment",
                title="Delivery rider (own motorcycle)",
                description=(
                    "Deliver food and parcels between Awgu, Mgbowo and Nenwe. "
                    "Fuel allowance paid weekly."
                ),
                eligibility="Adults 18+ with a rider's licence.",
                pay_details="N1,000 per delivery plus fuel allowance.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=30),
            ),
        ],
        "sessions": [
            {
                "topic": "Interview practice: answering the hard questions",
                "description": (
                    'Practise "tell me about yourself" and other common '
                    "questions in pairs, with feedback from a recruiter."
                ),
                "starts_at": NOW + timedelta(days=10, hours=3),
                "ends_at": NOW + timedelta(days=10, hours=5),
                "delivery_mode": "onsite",
                "location": "Awgu Civic Centre",
                "capacity": 35,
                "accessibility_notes": "Step-free entrance.",
                "organizer_contact": "hello@enugu-youthjobs.test",
            },
        ],
    },
    {
        "email": "power@awgu.local",
        "org": {
            "name": "Agbogugu Rural Electrification Project",
            "provider_type": "public_program",
            "public_contact": "project@agbogugu-power.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="contract",
                title="Meter installation helpers - six-week contract",
                description=(
                    "Assist licensed electricians installing prepaid meters in "
                    "homes. Safety training and gear given on day one."
                ),
                eligibility="Adults 18+. Comfortable working on ladders.",
                pay_details="N9,000 per day for six weeks, paid weekly.",
                location="Agbogugu",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=11),
            ),
            approved(
                opportunity_type="apprenticeship",
                title="Electrical installation apprenticeship",
                description=(
                    "Learn house wiring, fault finding and safe working with a "
                    "certified electrician. Leads to a trade test."
                ),
                eligibility="Aged 18-30. Basic maths.",
                cost_details="Free.",
                pay_details="Stipend of N25,000 per month.",
                location="Agbogugu",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=38),
            ),
            approved(
                opportunity_type="training",
                title="Electrical safety at home (community class)",
                description=(
                    "One afternoon on safe wiring, overloaded sockets and what to "
                    "do in an electrical fire."
                ),
                cost_details="Free.",
                location="Agbogugu",
                delivery_mode="onsite",
                application_route="in_person",
                deadline_at=NOW + timedelta(days=3),
            ),
        ],
    },
    {
        "email": "health@awgu.local",
        "org": {
            "name": "Ezere Community Health Partners",
            "provider_type": "ngo",
            "public_contact": "team@ezere-health.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="Nursing and midwifery school bursary",
                description=(
                    "Pays half the first-year fees for students from Awgu LGA "
                    "admitted to an accredited nursing or midwifery school."
                ),
                eligibility="Admission letter from an accredited school.",
                cost_details="No cost to apply.",
                pay_details="50% of first-year fees, paid to the school.",
                location="Ezere",
                delivery_mode="remote",
                application_route="platform",
                deadline_at=NOW + timedelta(days=44),
            ),
            approved(
                opportunity_type="employment",
                title="Pharmacy sales assistant",
                description=(
                    "Serve customers and keep stock records in a community "
                    "pharmacy, supervised by a pharmacist."
                ),
                eligibility="SSCE with a credit in Chemistry or Biology.",
                pay_details="N70,000 per month.",
                location="Ezere",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=17),
            ),
        ],
    },
    {
        "email": "women@awgu.local",
        "org": {
            "name": "Awgu Women in Agribusiness Network",
            "provider_type": "ngo",
            "public_contact": "network@awgu-agriwomen.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="training",
                title="Cassava processing and garri business course",
                description=(
                    "Three weeks on hygienic garri and fufu processing, "
                    "packaging, pricing and selling to traders."
                ),
                cost_details="N2,500 for materials.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=15),
            ),
            approved(
                opportunity_type="apprenticeship",
                title="Soap and detergent making apprenticeship",
                description=(
                    "Three months making liquid soap, bar soap and detergent, "
                    "then selling them through the network's stalls."
                ),
                eligibility="Women aged 18-35.",
                cost_details="Free.",
                pay_details="Keep 70% of what you sell.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=26),
            ),
            approved(
                opportunity_type="scholarship",
                title="Starter grant for young women farmers",
                description=(
                    "A one-off grant to buy seedlings, tools or a small pond for "
                    "a first farm business, with monthly mentoring."
                ),
                eligibility="Women aged 18-35 living in Awgu LGA.",
                cost_details="No cost to apply.",
                pay_details="One-off grant of N100,000.",
                location="Awgu LGA",
                delivery_mode="hybrid",
                application_route="platform",
                deadline_at=NOW + timedelta(days=36),
            ),
        ],
        "sessions": [
            {
                "topic": "Opening a bank account and saving for your business",
                "description": (
                    "What you need to open an account, how mobile banking works "
                    "and simple ways to save each week."
                ),
                "starts_at": NOW + timedelta(days=14, hours=2),
                "ends_at": NOW + timedelta(days=14, hours=4),
                "delivery_mode": "onsite",
                "location": "Mgbowo Market Hall",
                "capacity": 50,
                "accessibility_notes": "Seating provided. Children welcome.",
                "organizer_contact": "network@awgu-agriwomen.test",
            },
        ],
    },
    {
        "email": "civil@awgu.local",
        "org": {
            "name": "Udoka Civil Works Ltd",
            "provider_type": "sme",
            "public_contact": "jobs@udoka-civil.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="local_work",
                title="Roadside drainage clearing - paid day work",
                description=(
                    "Clear blocked drains before the rains along the Awgu-Mgbowo "
                    "road. Gloves, boots and tools provided. Adults only."
                ),
                eligibility="Adults 18+.",
                pay_details="N7,000 per day, paid daily.",
                location="Awgu",
                delivery_mode="onsite",
                application_route="in_person",
                min_age=18,
                deadline_at=NOW + timedelta(days=6),
            ),
            approved(
                opportunity_type="contract",
                title="Borehole site labourers - two-week contract",
                description=(
                    "Help a drilling crew set up and finish a community "
                    "borehole: mixing, carrying and site cleaning."
                ),
                eligibility="Adults 18+.",
                pay_details="N8,500 per day for two weeks.",
                location="Ihe",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=8),
            ),
            approved(
                opportunity_type="employment",
                title="Site timekeeper",
                description=(
                    "Record who is on site each day, track materials and send a "
                    "short daily report to the engineer."
                ),
                eligibility="SSCE or OND. Careful with numbers.",
                pay_details="N75,000 per month.",
                location="Awgu LGA",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=20),
            ),
        ],
    },
    {
        "email": "diaspora@awgu.local",
        "org": {
            "name": "Enugu Diaspora Scholars Foundation",
            "provider_type": "ngo",
            "public_contact": "apply@enugu-diaspora-scholars.test",
            "operating_area": "Enugu State",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="Undergraduate merit scholarship 2026",
                description=(
                    "Yearly support for first-year university students from "
                    "rural Enugu State, renewable while grades stay strong."
                ),
                eligibility="First-year undergraduates from Enugu State.",
                cost_details="No cost to apply.",
                pay_details="N250,000 per year.",
                location="Enugu",
                delivery_mode="remote",
                application_route="external",
                external_url="https://example.test/diaspora-merit",
                deadline_at=NOW + timedelta(days=62),
            ),
            approved(
                opportunity_type="training",
                title="Scholarship application masterclass (online)",
                description=(
                    "Four short online lessons: finding scholarships, personal "
                    "statements, reference letters and deadlines."
                ),
                cost_details="Free.",
                location="Enugu",
                delivery_mode="remote",
                application_route="platform",
                deadline_at=NOW + timedelta(days=29),
            ),
            pending(
                opportunity_type="scholarship",
                title="Postgraduate application fee support",
                description=(
                    "Pays application fees for up to three postgraduate "
                    "programmes for recent graduates from Enugu State."
                ),
                eligibility="Graduated in the last three years.",
                cost_details="No cost to apply.",
                pay_details="Up to N60,000 in application fees.",
                location="Enugu",
                delivery_mode="remote",
                application_route="external",
                external_url="https://example.test/postgrad-fees",
                deadline_at=NOW + timedelta(days=45),
            ),
        ],
        "sessions": [
            {
                "topic": "UTME and scholarship forms clinic (online)",
                "description": (
                    "Bring your questions about UTME registration and "
                    "scholarship forms. Volunteers answer live."
                ),
                "starts_at": NOW + timedelta(days=9, hours=5),
                "ends_at": NOW + timedelta(days=9, hours=6),
                "delivery_mode": "remote",
                "location": "Online video call (link sent after registering)",
                "capacity": 80,
                "accessibility_notes": "Captions on; works on low data.",
                "organizer_contact": "apply@enugu-diaspora-scholars.test",
            },
        ],
    },
    {
        "email": "hospitality@awgu.local",
        "org": {
            "name": "Mgbowo Hospitality Hub",
            "provider_type": "sme",
            "public_contact": "frontdesk@mgbowo-hospitality.test",
            "operating_area": "Awgu LGA",
        },
        "listings": [
            approved(
                opportunity_type="employment",
                title="Hotel front desk receptionist",
                description=(
                    "Check guests in and out, take bookings by phone and keep "
                    "the reception tidy. Shifts include some weekends."
                ),
                eligibility="SSCE or OND. Clear spoken English.",
                pay_details="N75,000 per month plus meals on shift.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=12),
            ),
            approved(
                opportunity_type="local_work",
                title="Weekend event waiters - paid day work",
                description=(
                    "Serve food and drinks at weddings and burials booked at the "
                    "hub. Uniform provided. Adults only."
                ),
                eligibility="Adults 18+.",
                pay_details="N6,500 per event day plus tips.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                min_age=18,
                deadline_at=NOW + timedelta(days=5),
            ),
            approved(
                opportunity_type="training",
                title="Catering and pastry course",
                description=(
                    "Six weeks of small chops, cakes and party jollof, plus "
                    "costing a menu for paying customers."
                ),
                cost_details="N5,000 for ingredients.",
                location="Mgbowo",
                delivery_mode="onsite",
                application_route="platform",
                deadline_at=NOW + timedelta(days=31),
            ),
        ],
    },
]


def wat_end_of_day(year: int, month: int, day: int) -> datetime:
    """23:59 West Africa Time (UTC+1) on the given date, stored in UTC."""
    return datetime(year, month, day, 22, 59, tzinfo=UTC)


# Real organisations, entered by staff rather than by a provider account, so
# no made-up user is ever attached to a real organisation. Facts were taken
# from each organisation's official page on 2026-10-22; check them again
# before a pitch or launch.
STAFF_ENTERED = [
    {
        # A sample listing prepared for AfricaPlan Foundation, who run
        # HackathonAfrica; cohort 4.0 has not been announced. Details follow
        # the cohort 3.0 call on africaplanfoundation.org.
        "org": {
            "name": "AfricaPlan Foundation",
            "provider_type": "ngo",
            "public_contact": "africaplanfoundation.org",
            "operating_area": "Enugu State",
        },
        "listings": [
            approved(
                opportunity_type="training",
                title="HackathonAfrica 4.0 software developer bootcamp",
                description=(
                    "A fully funded bootcamp that turns recent graduates into "
                    "software developers and AI engineers. About four months of "
                    "fully residential, project-based training in frontend and "
                    "backend development and soft skills, delivered with "
                    "training partner Hordanso, then internships with partner "
                    "tech companies and support into jobs. Earlier cohorts drew "
                    "over 2,500 applications. Cohort 4.0 is planned to start "
                    "around July 2027; AfricaPlan Foundation will confirm the "
                    "dates. This is a sample listing prepared for the "
                    "foundation."
                ),
                eligibility=(
                    "Recent graduates (NCE, OND, HND, bachelor's or master's) "
                    "who can attend full time and live on site. Applicants from "
                    "Awgu LGA are encouraged to apply."
                ),
                cost_details=(
                    "Free. AfricaPlan Foundation pays for training, housing and "
                    "meals."
                ),
                pay_details="Fully funded, with a partner internship after.",
                location="Enugu",
                delivery_mode="onsite",
                application_route="external",
                external_url="https://africaplanfoundation.org/hackathon-africa/",
                min_age=18,
                deadline_at=wat_end_of_day(2027, 5, 31),
                image_url="/images/listings/hackathonafrica.webp",
                is_featured=True,
            ),
        ],
    },
    {
        "org": {
            "name": "Nigerian Education Loan Fund (NELFUND)",
            "provider_type": "public_program",
            "public_contact": "nelf.gov.ng",
            "operating_area": "Nigeria",
            "verification_status": "pending",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="NELFUND student loan 2026/2027",
                description=(
                    "The Federal Government's interest-free student loan. It "
                    "pays tuition straight to your school and can add a "
                    "monthly upkeep allowance. You repay only after national "
                    "service, once you are working. Applications for the "
                    "2026/2027 session opened on 23 September 2026."
                ),
                eligibility=(
                    "Students admitted to an approved public university, "
                    "polytechnic or college of education. Your school must "
                    "have uploaded your record. Have your NIN, BVN and "
                    "admission letter ready."
                ),
                cost_details="Free to apply. Never pay anyone to apply for you.",
                pay_details="Tuition paid to your school; upkeep allowance available.",
                location="Nationwide",
                delivery_mode="remote",
                application_route="external",
                external_url="https://nelf.gov.ng/",
                deadline_at=wat_end_of_day(2026, 12, 31),
                source_url="https://nelf.gov.ng/",
                image_url="/images/listings/student-loan.webp",
            ),
        ],
    },
    {
        "org": {
            "name": "Female Scholars Foundation",
            "provider_type": "ngo",
            "public_contact": "femalescholars.org",
            "operating_area": "Nigeria",
            "verification_status": "pending",
        },
        "listings": [
            approved(
                opportunity_type="scholarship",
                title="Female Scholars Foundation university scholarship 2026",
                description=(
                    "A full university scholarship for young women from rural "
                    "communities, covering tuition, books and living costs, "
                    "with an industry mentor, internships and leadership "
                    "coaching. Shortlisted applicants are interviewed."
                ),
                eligibility=(
                    "Female, aged 20 or under, from a public secondary school, "
                    "admitted to a public university, with a 2026 UTME score of "
                    "at least 240 and five A1-B3 grades in WAEC or NECO."
                ),
                cost_details="No cost to apply.",
                pay_details="Tuition, books and living expenses throughout university.",
                location="Nationwide",
                delivery_mode="remote",
                application_route="external",
                external_url="https://femalescholars.org/",
                deadline_at=wat_end_of_day(2026, 12, 31),
                source_url="https://femalescholars.org/",
                image_url="/images/listings/female-scholars.webp",
            ),
        ],
    },
    {
        "org": {
            "name": "3 Million Technical Talent (3MTT) programme",
            "provider_type": "public_program",
            "public_contact": "3mtt.nitda.gov.ng",
            "operating_area": "Nigeria",
            "verification_status": "pending",
        },
        "listings": [
            approved(
                opportunity_type="training",
                title="3MTT tech talent fellowship",
                description=(
                    "Free federal training in in-demand tech skills: software "
                    "development, data analysis, cybersecurity, UI/UX, cloud, "
                    "AI and more. Self-paced online courses are combined with "
                    "in-person learning sessions in every state. Run by the "
                    "Federal Ministry of Communications, Innovation and Digital "
                    "Economy with NITDA."
                ),
                eligibility="Young Nigerians who want a career in tech.",
                cost_details="Free.",
                location="Nationwide (learning centres in Enugu)",
                delivery_mode="hybrid",
                application_route="external",
                external_url="https://3mtt.nitda.gov.ng/",
                source_url="https://3mtt.nitda.gov.ng/",
                image_url="/images/listings/3mtt.webp",
            ),
        ],
    },
    {
        "org": {
            "name": "Nigerian Youth Academy (NiYA)",
            "provider_type": "public_program",
            "public_contact": "niya.gov.ng",
            "operating_area": "Nigeria",
            "verification_status": "pending",
        },
        "listings": [
            approved(
                opportunity_type="training",
                title="NiYA free online courses with certificates",
                description=(
                    "More than 50 free online courses in digital skills, "
                    "business, entrepreneurship and leadership from the Federal "
                    "Ministry of Youth Development, each with a government "
                    "certificate of completion. Create an account and enrol "
                    "from your dashboard."
                ),
                eligibility="Young Nigerians. No academic qualifications needed.",
                cost_details="Free. The official site never asks for payment.",
                location="Online",
                delivery_mode="remote",
                application_route="external",
                external_url="https://niya.gov.ng/",
                source_url="https://yid.fmyd.gov.ng/?p=3828",
                image_url="/images/listings/online-courses.webp",
            ),
        ],
    },
    {
        "org": {
            "name": "Enugu MSME & Startup Agency",
            "provider_type": "public_program",
            "public_contact": "enugusme.en.gov.ng",
            "operating_area": "Enugu State",
            "verification_status": "pending",
        },
        "listings": [
            approved(
                opportunity_type="apprenticeship",
                title="SUPA-ITF Enugu Artisan Skills Accelerator",
                description=(
                    "Free hands-on training for 700 artisans with the "
                    "Industrial Training Fund, in building construction, "
                    "fashion, ICT, automotive and hospitality. Delivered by "
                    "accredited training centres across Enugu State, with "
                    "pathways into jobs, apprenticeships and your own business."
                ),
                eligibility=(
                    "Working artisans who want further training, and new "
                    "entrants to a trade. Places are competitive."
                ),
                cost_details="Free.",
                location="Enugu State",
                delivery_mode="onsite",
                application_route="external",
                external_url="https://www.enugusme.en.gov.ng/programs/supa-itf",
                source_url="https://www.enugusme.en.gov.ng/programs/supa-itf",
                image_url="/images/listings/artisan-training.webp",
            ),
            approved(
                opportunity_type="training",
                title="Enugu Digital Marketing Training (EDMT)",
                description=(
                    "Ten weeks of practical digital marketing for young people "
                    "and small businesses: two classes a week in person and one "
                    "live online session, plus CV revamping and career "
                    "mentorship. For jobs, freelancing or growing your own "
                    "business."
                ),
                eligibility=(
                    "Young professionals, entrepreneurs and anyone interested "
                    "in freelancing or remote work. No experience needed."
                ),
                cost_details="Free.",
                location="Enugu",
                delivery_mode="hybrid",
                application_route="external",
                external_url="https://www.enugusme.en.gov.ng/programs/edmt",
                source_url="https://www.enugusme.en.gov.ng/programs/edmt",
                image_url="/images/listings/digital-marketing.webp",
            ),
            approved(
                opportunity_type="training",
                title="Enugu Green Tech Talent Accelerator: solar and EV tracks",
                description=(
                    "Sixteen weeks of hands-on training in solar energy "
                    "systems, electric vehicle diagnostics, electronics, "
                    "robotics and IoT, or computer engineering, with real "
                    "installations, certification and career support after."
                ),
                eligibility=(
                    "A valid government ID (NIN, voter's card, licence or "
                    "passport)."
                ),
                cost_details=(
                    "From N100,000 (solar: N65,000 upfront and N35,000 as a "
                    "state Human Capital Development Loan) to N150,000 for EV."
                ),
                location="Enugu (GRA)",
                delivery_mode="onsite",
                application_route="external",
                external_url="https://www.enugusme.en.gov.ng/programs/egtta",
                source_url="https://www.enugusme.en.gov.ng/programs/egtta",
                image_url="/images/listings/green-tech.webp",
            ),
            approved(
                opportunity_type="training",
                title="Enugu Magic Labs Animation Training (EMAT)",
                description=(
                    "Six months (three of coursework, three of projects) in 2D "
                    "illustration, 3D motion graphics, creative writing and "
                    "visual design for 400 young people, with mentorship and "
                    "access to global freelance marketplaces."
                ),
                eligibility="Young people in Enugu State interested in creative tech.",
                cost_details=(
                    "N135,000, which can be spread as a state Human Capital "
                    "Development Loan over 12 months."
                ),
                location="Enugu (GRA)",
                delivery_mode="onsite",
                application_route="external",
                external_url="https://www.enugusme.en.gov.ng/programs/emat",
                source_url="https://www.enugusme.en.gov.ng/programs/emat",
                image_url="/images/listings/animation.webp",
            ),
            approved(
                opportunity_type="training",
                title="Enugu SME DHL GO-TRADE export training (online)",
                description=(
                    "A free two-day online course with DHL for product-based "
                    "Enugu businesses that want to sell abroad: logistics, "
                    "customs paperwork and scaling, with a DHL certificate."
                ),
                eligibility="Owners of product-based small businesses in Enugu State.",
                cost_details="Free.",
                location="Online",
                delivery_mode="remote",
                application_route="external",
                external_url=(
                    "https://www.enugusme.en.gov.ng/programs/enugu-dhl-go-trade-programme"
                ),
                source_url=(
                    "https://www.enugusme.en.gov.ng/programs/enugu-dhl-go-trade-programme"
                ),
                image_url="/images/listings/export-business.webp",
            ),
        ],
    },
]

# A photo for each demo listing, by title (files in apps/web/public/images/
# listings, made by apps/web/scripts/fetch-photos.mjs).
LISTING_IMAGES = {
    "Solar installation apprenticeship": "solar-install",
    "Basic computer skills training": "computer-class",
    "State secondary scholarship 2026": "secondary-students",
    "Undergraduate bursary award": "university-students",
    "Market stall construction - paid day work": "construction",
    "Shop assistant (entry level)": "shop-assistant",
    "Tailoring and fashion design apprenticeship": "tailoring",
    "Weekend bead-making and small business class": "beads",
    "Festival setup helpers - paid day work": "event-setup",
    "Health records assistant (entry level)": "clinic-desk",
    "First aid and community health volunteer course": "first-aid",
    "Online coding bootcamp for beginners": "coding",
    "Digital marketing for small businesses (online)": "phone-business",
    "Phone and laptop repair apprenticeship": "phone-repair",
    "Customer support agent (remote, part-time)": "customer-support",
    "Cashew harvest - paid seasonal work": "harvest",
    "Poultry farming apprenticeship": "poultry",
    "Fish farming starter course": "fish-farm",
    "WAEC exam fee support 2026": "exam-hall",
    "Girls in STEM university bursary": "stem-women",
    "Carpentry and furniture-making apprenticeship": "carpentry",
    "Furniture delivery helpers - paid day work": "loading",
    "Showroom sales assistant": "furniture-shop",
    "Auto mechanic apprenticeship": "mechanic",
    "Motorcycle and tricycle repair apprenticeship": "motorcycle-repair",
    "Road safety and rider licence preparation": "motorcycle-rider",
    "JAMB UTME registration support": "computer-exam",
    "Uniform and textbook grant": "school-children",
    "Classroom painting - paid weekend work": "painting",
    "Agro-input sales representative": "farmer-field",
    "POS banking agent": "pos-agent",
    "Data entry clerk (hybrid)": "data-entry",
    "Job readiness and soft skills (online)": "workshop-group",
    "Delivery rider (own motorcycle)": "delivery-rider",
    "Meter installation helpers - six-week contract": "electrician",
    "Electrical installation apprenticeship": "wiring",
    "Electrical safety at home (community class)": "community-class",
    "Nursing and midwifery school bursary": "nursing",
    "Pharmacy sales assistant": "pharmacy",
    "Cassava processing and garri business course": "cassava",
    "Soap and detergent making apprenticeship": "soap-making",
    "Starter grant for young women farmers": "women-farmers",
    "Roadside drainage clearing - paid day work": "road-work",
    "Borehole site labourers - two-week contract": "borehole",
    "Site timekeeper": "site-clipboard",
    "Hotel front desk receptionist": "hotel-reception",
    "Weekend event waiters - paid day work": "waiters",
    "Catering and pastry course": "pastry",
    "Undergraduate merit scholarship 2026": "graduation",
    "Scholarship application masterclass (online)": "laptop-study",
    "Postgraduate application fee support": "postgraduate",
}


async def seed_demo() -> None:
    async with SessionLocal() as db:
        created_orgs = 0
        created_listings = 0
        created_sessions = 0
        admin = await identity_repo.get_user_by_email(db, "admin@awgu.local")
        for entry in DEMO + STAFF_ENTERED:
            for data in entry["listings"]:
                slug = LISTING_IMAGES.get(data["title"])
                if slug and "image_url" not in data:
                    data["image_url"] = f"/images/listings/{slug}.webp"
            if entry.get("email"):
                user = await ensure_user(db, entry["email"])
            else:
                # Staff-entered: the listing belongs to the admin who copied it.
                user = admin
            org_existed = await db.scalar(
                select(Organization.id).where(
                    Organization.name == entry["org"]["name"]
                )
            )
            org = await ensure_org(db, **entry["org"])
            if org_existed is None:
                created_orgs += 1
            if entry.get("email"):
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
