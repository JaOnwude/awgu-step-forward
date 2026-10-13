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


async def ensure_listing(
    db: AsyncSession, *, org: Organization, user: User, data: dict
) -> None:
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.organization_id == org.id,
            Opportunity.title == data["title"],
        )
    )
    if result.scalar_one_or_none() is not None:
        return
    db.add(
        Opportunity(
            organization_id=org.id,
            created_by_user_id=user.id,
            **data,
        )
    )


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
]


async def seed_demo() -> None:
    async with SessionLocal() as db:
        created_orgs = 0
        created_listings = 0
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

        await db.commit()
        print(
            f"Demo seed complete: {created_orgs} provider(s) and "
            f"{created_listings} listing(s) created."
        )


if __name__ == "__main__":
    asyncio.run(seed_demo())
