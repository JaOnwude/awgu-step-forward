from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    AuthContext,
    get_optional_context,
    verify_csrf,
)
from app.db.session import get_db
from app.features.opportunities import service
from app.features.opportunities.schemas import (
    OpportunityCreate,
    OpportunityDetail,
    OpportunityListResponse,
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


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None),
    location: str | None = Query(default=None, max_length=100),
    delivery_mode: str | None = Query(default=None),
    sort: str = Query(default="relevance"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> OpportunityListResponse:
    return await service.list_public_opportunities(
        db,
        q=q,
        category=category,
        location=location,
        delivery_mode=delivery_mode,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/{opportunity_id}", response_model=OpportunityDetail)
async def get_opportunity(
    opportunity_id: uuid.UUID,
    ctx: AuthContext | None = Depends(get_optional_context),
    db: AsyncSession = Depends(get_db),
) -> OpportunityDetail:
    return await service.get_opportunity_detail(
        db,
        user=ctx.user if ctx else None,
        roles=ctx.roles if ctx else set(),
        opportunity_id=opportunity_id,
    )


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
