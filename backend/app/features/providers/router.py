from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.errors import NotFoundError
from app.core.roles import STAFF_ROLES
from app.db.session import get_db
from app.features.providers import repository as repo
from app.features.providers import service
from app.features.providers.schemas import (
    ProviderDetail,
    ProviderRequestCreate,
    ProviderView,
)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.post("", response_model=ProviderView, status_code=201)
async def request_provider_access(
    payload: ProviderRequestCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ProviderView:
    org = await service.request_provider_access(db, user=ctx.user, payload=payload)
    return service.serialize_provider(org)


@router.get("", response_model=list[ProviderView])
async def my_providers(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> list[ProviderView]:
    memberships = await repo.list_memberships_for_user(db, ctx.user.id)
    views: list[ProviderView] = []
    for membership in memberships:
        org = await repo.get_organization(db, membership.organization_id)
        if org is not None:
            views.append(service.serialize_provider(org))
    return views


@router.get("/{provider_id}", response_model=ProviderDetail)
async def get_provider(
    provider_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> ProviderDetail:
    org = await repo.get_organization(db, provider_id)
    if org is None:
        raise NotFoundError("Provider not found.")
    if not (ctx.roles & STAFF_ROLES):
        await service.require_membership(
            db, user_id=ctx.user.id, organization_id=org.id
        )
    return await service.get_provider_detail(db, org=org)
