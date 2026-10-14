from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_optional_context
from app.core.errors import PermissionDeniedError
from app.core.security import hash_token, safe_equals
from app.db.session import get_db
from app.features.reports import service
from app.features.reports.schemas import ReportCreate, ReportReceipt

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportReceipt, status_code=201)
async def create_report(
    payload: ReportCreate,
    request: Request,
    ctx: AuthContext | None = Depends(get_optional_context),
    db: AsyncSession = Depends(get_db),
) -> ReportReceipt:
    # Anyone may report, signed in or not. A signed-in browser sends its
    # session cookie, so it must also prove the request is its own (CSRF).
    if ctx is not None:
        provided = request.headers.get("X-CSRF-Token")
        if not provided or not safe_equals(
            hash_token(provided), ctx.session.csrf_token_hash
        ):
            raise PermissionDeniedError(
                "Invalid or missing CSRF token.", code="csrf_failed"
            )
    return await service.create_report(
        db,
        user=ctx.user if ctx else None,
        client_host=request.client.host if request.client else None,
        payload=payload,
    )
