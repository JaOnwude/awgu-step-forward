from __future__ import annotations

import uuid

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.identity.models import utcnow
from app.features.opportunities.models import ListingRevision, Opportunity


async def get_opportunity(
    db: AsyncSession, opportunity_id: uuid.UUID
) -> Opportunity | None:
    # Eager-load work terms: lazy loads raise MissingGreenlet under asyncio.
    result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.work_terms))
        .where(Opportunity.id == opportunity_id)
    )
    return result.scalar_one_or_none()


async def list_by_status(
    db: AsyncSession, status: str
) -> list[Opportunity]:
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.status == status)
        .order_by(Opportunity.submitted_at, Opportunity.created_at)
    )
    return list(result.scalars().all())


async def search_public(
    db: AsyncSession,
    *,
    q: str | None,
    category: str | None,
    location: str | None,
    delivery_mode: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> tuple[list[Opportunity], int]:
    now = utcnow()
    conditions = [
        Opportunity.status == "approved",
        or_(Opportunity.deadline_at.is_(None), Opportunity.deadline_at >= now),
    ]
    if q:
        like = f"%{q.strip()}%"
        conditions.append(
            or_(
                Opportunity.title.ilike(like),
                Opportunity.description.ilike(like),
            )
        )
    if category:
        conditions.append(Opportunity.opportunity_type == category)
    if location:
        conditions.append(Opportunity.location.ilike(f"%{location.strip()}%"))
    if delivery_mode:
        conditions.append(Opportunity.delivery_mode == delivery_mode)

    total = await db.scalar(
        select(func.count()).select_from(Opportunity).where(*conditions)
    )

    # Awgu-first ranking, then the soonest still-open deadline.
    awgu_first = case((Opportunity.location.ilike("%awgu%"), 0), else_=1)
    deadline_missing = Opportunity.deadline_at.is_(None)
    if sort == "newest":
        order = [
            Opportunity.published_at.is_(None),
            Opportunity.published_at.desc(),
            Opportunity.created_at.desc(),
        ]
    elif sort == "deadline":
        order = [
            deadline_missing,
            Opportunity.deadline_at.asc(),
            awgu_first,
            Opportunity.created_at.desc(),
        ]
    else:
        order = [
            awgu_first,
            deadline_missing,
            Opportunity.deadline_at.asc(),
            Opportunity.created_at.desc(),
        ]

    result = await db.execute(
        select(Opportunity)
        .where(*conditions)
        .order_by(*order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


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
