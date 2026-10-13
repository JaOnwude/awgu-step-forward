from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.opportunities.models import ListingRevision, Opportunity


async def get_opportunity(
    db: AsyncSession, opportunity_id: uuid.UUID
) -> Opportunity | None:
    return await db.get(Opportunity, opportunity_id)


async def list_by_status(
    db: AsyncSession, status: str
) -> list[Opportunity]:
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.status == status)
        .order_by(Opportunity.submitted_at, Opportunity.created_at)
    )
    return list(result.scalars().all())


async def next_revision_number(
    db: AsyncSession, opportunity_id: uuid.UUID
) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(ListingRevision.revision_number), 0)).where(
            ListingRevision.opportunity_id == opportunity_id
        )
    )
    return int(result.scalar_one()) + 1


async def latest_pending_revision(
    db: AsyncSession, opportunity_id: uuid.UUID
) -> ListingRevision | None:
    result = await db.execute(
        select(ListingRevision)
        .where(
            ListingRevision.opportunity_id == opportunity_id,
            ListingRevision.decision == "pending",
        )
        .order_by(ListingRevision.revision_number.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
