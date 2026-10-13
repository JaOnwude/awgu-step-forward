from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, require_roles, verify_csrf
from app.core.errors import PermissionDeniedError
from app.core.roles import STAFF_ROLES
from app.db.session import get_db
from app.features.moderation import service
from app.features.moderation.schemas import ModerationQueue
from app.features.opportunities.schemas import (
    ModerationDecisionRequest,
    OpportunityView,
)
from app.features.providers import service as provider_service
from app.features.providers.schemas import (
    ProviderView,
    VerificationDecisionRequest,
)

router = APIRouter(prefix="/admin/moderation", tags=["moderation"])


def _require_staff(ctx: AuthContext) -> None:
    if not (ctx.roles & STAFF_ROLES):
        raise PermissionDeniedError()


@router.get("/queue", response_model=ModerationQueue)
async def get_queue(
    ctx: AuthContext = Depends(require_roles(*STAFF_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ModerationQueue:
    providers, listings = await service.moderation_queue(db)
    return ModerationQueue(
        providers=[provider_service.serialize_provider(o) for o in providers],
        listings=[OpportunityView.model_validate(o) for o in listings],
    )


@router.post("/providers/{provider_id}/verification", response_model=ProviderView)
async def decide_provider(
    provider_id: uuid.UUID,
    payload: VerificationDecisionRequest,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ProviderView:
    _require_staff(ctx)
    org = await provider_service.decide_verification(
        db,
        admin=ctx.user,
        organization_id=provider_id,
        decision=payload.decision,
        rationale=payload.rationale,
        recheck_days=payload.recheck_days,
    )
    return provider_service.serialize_provider(org)


@router.post("/listings/{opportunity_id}/decision", response_model=OpportunityView)
async def decide_listing(
    opportunity_id: uuid.UUID,
    payload: ModerationDecisionRequest,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> OpportunityView:
    _require_staff(ctx)
    opp = await service.decide_listing(
        db,
        admin=ctx.user,
        opportunity_id=opportunity_id,
        decision=payload.decision,
        reason=payload.reason,
    )
    return OpportunityView.model_validate(opp)
