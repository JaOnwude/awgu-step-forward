from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.db.session import get_db
from app.features.applications import service
from app.features.applications.schemas import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationFormView,
    ApplicationReceipt,
    ApplicationSummary,
    ApplicationUpdate,
    ApplicationWithdrawRequest,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/form/{opportunity_id}", response_model=ApplicationFormView)
async def get_form(
    opportunity_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_context),
) -> ApplicationFormView:
    return service.form_view(opportunity_id)


@router.post("", response_model=ApplicationDetail, status_code=201)
async def create_or_get_application(
    payload: ApplicationCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ApplicationDetail:
    return await service.create_or_get_draft(
        db, user=ctx.user, opportunity_id=payload.opportunity_id
    )


@router.get("", response_model=list[ApplicationSummary])
async def list_applications(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> list[ApplicationSummary]:
    return await service.list_for_applicant(db, user=ctx.user)


@router.get("/{application_id}", response_model=ApplicationDetail)
async def get_application(
    application_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> ApplicationDetail:
    return await service.get_detail(db, user=ctx.user, application_id=application_id)


@router.patch("/{application_id}", response_model=ApplicationDetail)
async def update_application(
    application_id: uuid.UUID,
    payload: ApplicationUpdate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ApplicationDetail:
    return await service.update_answers(
        db, user=ctx.user, application_id=application_id, payload=payload
    )


@router.post("/{application_id}/submit", response_model=ApplicationReceipt)
async def submit_application(
    application_id: uuid.UUID,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> ApplicationReceipt:
    return await service.submit(
        db,
        user=ctx.user,
        application_id=application_id,
        idempotency_key=idempotency_key,
    )


@router.post("/{application_id}/withdraw", response_model=ApplicationDetail)
async def withdraw_application(
    application_id: uuid.UUID,
    payload: ApplicationWithdrawRequest,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ApplicationDetail:
    return await service.withdraw(
        db,
        user=ctx.user,
        application_id=application_id,
        note=payload.note,
    )
