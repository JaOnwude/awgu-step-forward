from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.applicant.models import ApplicantProfile, SavedOpportunity


async def get_profile(
    db: AsyncSession, user_id: uuid.UUID
) -> ApplicantProfile | None:
    result = await db.execute(
        select(ApplicantProfile).where(ApplicantProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def preferred_names(
    db: AsyncSession, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """Preferred names only, for rosters that must not see other profile data."""
    if not user_ids:
        return {}
    result = await db.execute(
        select(ApplicantProfile.user_id, ApplicantProfile.preferred_name).where(
            ApplicantProfile.user_id.in_(user_ids)
        )
    )
    return {row[0]: row[1] for row in result.all()}


async def get_saved(
    db: AsyncSession, *, user_id: uuid.UUID, opportunity_id: uuid.UUID
) -> SavedOpportunity | None:
    result = await db.execute(
        select(SavedOpportunity).where(
            SavedOpportunity.user_id == user_id,
            SavedOpportunity.opportunity_id == opportunity_id,
        )
    )
    return result.scalar_one_or_none()


async def list_saved(
    db: AsyncSession, user_id: uuid.UUID
) -> list[SavedOpportunity]:
    result = await db.execute(
        select(SavedOpportunity)
        .where(SavedOpportunity.user_id == user_id)
        .order_by(SavedOpportunity.created_at.desc())
    )
    return list(result.scalars().all())
