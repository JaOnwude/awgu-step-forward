from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.db.session import get_db
from app.features.applicant import service
from app.features.applicant.schemas import (
    ApplicantProfileUpdate,
    ApplicantProfileView,
    SavedListingCreate,
    SavedListingView,
)

router = APIRouter(prefix="/me", tags=["applicant"])


@router.get("/profile", response_model=ApplicantProfileView)
async def get_profile(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> ApplicantProfileView:
    profile = await service.get_profile(db, user=ctx.user)
    return ApplicantProfileView.model_validate(profile)


@router.put("/profile", response_model=ApplicantProfileView)
async def update_profile(
    payload: ApplicantProfileUpdate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ApplicantProfileView:
    profile = await service.upsert_profile(db, user=ctx.user, payload=payload)
    return ApplicantProfileView.model_validate(profile)


@router.get("/saved", response_model=list[SavedListingView])
async def list_saved(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> list[SavedListingView]:
    return await service.list_saved(db, user=ctx.user)


@router.post("/saved", response_model=SavedListingView, status_code=201)
async def save_listing(
    payload: SavedListingCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> SavedListingView:
    return await service.save_listing(
        db, user=ctx.user, opportunity_id=payload.opportunity_id
    )


@router.delete("/saved/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_listing(
    opportunity_id: uuid.UUID,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.unsave_listing(
        db, user=ctx.user, opportunity_id=opportunity_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
