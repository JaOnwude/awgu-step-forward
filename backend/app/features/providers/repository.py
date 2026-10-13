from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.providers.models import (
    Organization,
    ProviderMembership,
    VerificationCase,
)


async def get_organization(
    db: AsyncSession, organization_id: uuid.UUID
) -> Organization | None:
    return await db.get(Organization, organization_id)


async def get_membership(
    db: AsyncSession, *, organization_id: uuid.UUID, user_id: uuid.UUID
) -> ProviderMembership | None:
    result = await db.execute(
        select(ProviderMembership).where(
            ProviderMembership.organization_id == organization_id,
            ProviderMembership.user_id == user_id,
            ProviderMembership.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def list_memberships_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> list[ProviderMembership]:
    result = await db.execute(
        select(ProviderMembership)
        .where(
            ProviderMembership.user_id == user_id,
            ProviderMembership.status == "active",
        )
        .order_by(ProviderMembership.created_at)
    )
    return list(result.scalars().all())


async def list_members(
    db: AsyncSession, organization_id: uuid.UUID
) -> list[ProviderMembership]:
    result = await db.execute(
        select(ProviderMembership)
        .where(ProviderMembership.organization_id == organization_id)
        .order_by(ProviderMembership.created_at)
    )
    return list(result.scalars().all())


async def list_pending_organizations(db: AsyncSession) -> list[Organization]:
    result = await db.execute(
        select(Organization)
        .where(Organization.verification_status == "pending")
        .order_by(Organization.created_at)
    )
    return list(result.scalars().all())


async def latest_verification_case(
    db: AsyncSession, organization_id: uuid.UUID
) -> VerificationCase | None:
    result = await db.execute(
        select(VerificationCase)
        .where(VerificationCase.organization_id == organization_id)
        .order_by(VerificationCase.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
