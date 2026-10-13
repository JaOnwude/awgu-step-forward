from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.applications.models import (
    Application,
    ApplicationAnswer,
    ApplicationStatusEvent,
)


async def get_application(
    db: AsyncSession, application_id: uuid.UUID
) -> Application | None:
    return await db.get(Application, application_id)


async def get_by_applicant_listing(
    db: AsyncSession, *, applicant_user_id: uuid.UUID, opportunity_id: uuid.UUID
) -> Application | None:
    result = await db.execute(
        select(Application).where(
            Application.applicant_user_id == applicant_user_id,
            Application.opportunity_id == opportunity_id,
        )
    )
    return result.scalar_one_or_none()


async def get_by_idempotency_key(
    db: AsyncSession, key: str
) -> Application | None:
    result = await db.execute(
        select(Application).where(Application.idempotency_key == key)
    )
    return result.scalar_one_or_none()


async def list_by_applicant(
    db: AsyncSession, applicant_user_id: uuid.UUID
) -> list[Application]:
    result = await db.execute(
        select(Application)
        .where(Application.applicant_user_id == applicant_user_id)
        .order_by(Application.updated_at.desc())
    )
    return list(result.scalars().all())


async def list_answers(
    db: AsyncSession, application_id: uuid.UUID
) -> list[ApplicationAnswer]:
    result = await db.execute(
        select(ApplicationAnswer)
        .where(ApplicationAnswer.application_id == application_id)
        .order_by(ApplicationAnswer.question_key)
    )
    return list(result.scalars().all())


async def get_answer(
    db: AsyncSession, *, application_id: uuid.UUID, question_key: str
) -> ApplicationAnswer | None:
    result = await db.execute(
        select(ApplicationAnswer).where(
            ApplicationAnswer.application_id == application_id,
            ApplicationAnswer.question_key == question_key,
        )
    )
    return result.scalar_one_or_none()


async def list_events(
    db: AsyncSession, application_id: uuid.UUID
) -> list[ApplicationStatusEvent]:
    result = await db.execute(
        select(ApplicationStatusEvent)
        .where(ApplicationStatusEvent.application_id == application_id)
        .order_by(ApplicationStatusEvent.created_at)
    )
    return list(result.scalars().all())
