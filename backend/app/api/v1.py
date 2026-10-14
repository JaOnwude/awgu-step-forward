from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, require_roles
from app.db.session import get_db
from app.features.applicant.router import router as applicant_router
from app.features.applications.router import router as applications_router
from app.features.audit.service import record_event
from app.features.identity.router import router as identity_router
from app.features.moderation.router import router as moderation_router
from app.features.opportunities.router import router as opportunities_router
from app.features.providers.router import router as providers_router
from app.features.sessions.router import me_router as session_me_router
from app.features.sessions.router import router as sessions_router

api_router = APIRouter()
api_router.include_router(identity_router)
api_router.include_router(providers_router)
api_router.include_router(opportunities_router)
api_router.include_router(moderation_router)
api_router.include_router(applicant_router)
api_router.include_router(applications_router)
api_router.include_router(sessions_router)
api_router.include_router(session_me_router)


@api_router.get("/admin/ping", tags=["admin"])
async def admin_ping(
    request: Request,
    ctx: AuthContext = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    await record_event(
        db,
        action="admin.ping",
        actor_user_id=ctx.user.id,
        target_type="system",
        request_id=getattr(request.state, "request_id", None),
    )
    await db.commit()
    return {
        "status": "ok",
        "user_id": str(ctx.user.id),
        "roles": sorted(ctx.roles),
    }
