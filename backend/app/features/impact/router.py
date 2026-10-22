from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, require_roles
from app.core.roles import STAFF_ROLES
from app.db.session import get_db
from app.features.impact import service
from app.features.impact.schemas import ImpactStats

router = APIRouter(prefix="/admin/impact", tags=["impact"])


@router.get("", response_model=ImpactStats)
async def get_impact(
    ctx: AuthContext = Depends(require_roles(*STAFF_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> ImpactStats:
    """Aggregate counts for the staff impact dashboard. Staff only."""
    return await service.impact_stats(db)
