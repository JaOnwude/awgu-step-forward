from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.db.session import get_db
from app.features.opportunities import service
from app.features.opportunities.schemas import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityView,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.post("", response_model=OpportunityView, status_code=201)
async def create_opportunity(
    payload: OpportunityCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> OpportunityView:
    opp = await service.create_draft(db, user=ctx.user, payload=payload)
    return OpportunityView.model_validate(opp)


@router.get("/{opportunity_id}", response_model=OpportunityView)
async def get_opportunity(
    opportunity_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> OpportunityView:
    opp = await service.get_opportunity_for_read(
        db, user=ctx.user, roles=ctx.roles, opportunity_id=opportunity_id
    )
    return OpportunityView.model_validate(opp)


@router.patch("/{opportunity_id}", response_model=OpportunityView)
async def update_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityUpdate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> OpportunityView:
    opp = await service.update_opportunity(
        db, user=ctx.user, opportunity_id=opportunity_id, payload=payload
    )
    return OpportunityView.model_validate(opp)


@router.post("/{opportunity_id}/submit", response_model=OpportunityView)
async def submit_opportunity(
    opportunity_id: uuid.UUID,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> OpportunityView:
    opp = await service.submit_for_review(
        db, user=ctx.user, opportunity_id=opportunity_id
    )
    return OpportunityView.model_validate(opp)
