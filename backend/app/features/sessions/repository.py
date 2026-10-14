from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.sessions.models import ApplicationSupportSession, SessionRegistration


async def get_session(
    db: AsyncSession, session_id: uuid.UUID, *, for_update: bool = False
) -> ApplicationSupportSession | None:
    query = select(ApplicationSupportSession).where(
        ApplicationSupportSession.id == session_id
    )
    if for_update:
        # Serialises concurrent registrations so capacity cannot be overrun.
        # (SQLite ignores FOR UPDATE; PostgreSQL enforces it.)
        query = query.with_for_update()
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def registered_counts(
    db: AsyncSession, session_ids: list[uuid.UUID]
) -> dict[uuid.UUID, int]:
    if not session_ids:
        return {}
    result = await db.execute(
        select(SessionRegistration.session_id, func.count())
        .where(
            SessionRegistration.session_id.in_(session_ids),
            SessionRegistration.status == "registered",
        )
        .group_by(SessionRegistration.session_id)
    )
    return {row[0]: row[1] for row in result.all()}


async def list_public(
    db: AsyncSession, *, now: datetime, page: int, page_size: int
) -> tuple[list[ApplicationSupportSession], int]:
    conditions = (
        ApplicationSupportSession.status == "approved",
        ApplicationSupportSession.ends_at >= now,
    )
    total = await db.scalar(
        select(func.count()).select_from(ApplicationSupportSession).where(*conditions)
    )
    result = await db.execute(
        select(ApplicationSupportSession)
        .where(*conditions)
        .order_by(ApplicationSupportSession.starts_at, ApplicationSupportSession.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def list_for_organizations(
    db: AsyncSession, organization_ids: list[uuid.UUID]
) -> list[ApplicationSupportSession]:
    if not organization_ids:
        return []
    result = await db.execute(
        select(ApplicationSupportSession)
        .where(ApplicationSupportSession.organization_id.in_(organization_ids))
        .order_by(ApplicationSupportSession.starts_at.desc())
    )
    return list(result.scalars().all())


async def list_by_status(
    db: AsyncSession, status: str
) -> list[ApplicationSupportSession]:
    result = await db.execute(
        select(ApplicationSupportSession)
        .where(ApplicationSupportSession.status == status)
        .order_by(ApplicationSupportSession.submitted_at)
    )
    return list(result.scalars().all())


async def get_registration(
    db: AsyncSession, *, session_id: uuid.UUID, user_id: uuid.UUID
) -> SessionRegistration | None:
    result = await db.execute(
        select(SessionRegistration).where(
            SessionRegistration.session_id == session_id,
            SessionRegistration.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_registration_by_id(
    db: AsyncSession, registration_id: uuid.UUID
) -> SessionRegistration | None:
    return await db.get(SessionRegistration, registration_id)


async def list_registrations_for_session(
    db: AsyncSession, session_id: uuid.UUID
) -> list[SessionRegistration]:
    result = await db.execute(
        select(SessionRegistration)
        .where(SessionRegistration.session_id == session_id)
        .order_by(SessionRegistration.registered_at)
    )
    return list(result.scalars().all())


async def list_registrations_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> list[SessionRegistration]:
    result = await db.execute(
        select(SessionRegistration)
        .where(SessionRegistration.user_id == user_id)
        .order_by(SessionRegistration.registered_at.desc())
    )
    return list(result.scalars().all())
