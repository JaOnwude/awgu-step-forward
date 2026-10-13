from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.config import get_settings
from app.db.session import get_db
from app.features.identity import service
from app.features.identity.schemas import (
    DevLoginRequest,
    LoginResponse,
    MessageResponse,
    UserPublic,
)

_settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(
    response: Response, raw_token: str, raw_csrf: str
) -> None:
    max_age = _settings.session_ttl_hours * 3600
    response.set_cookie(
        _settings.session_cookie_name,
        raw_token,
        max_age=max_age,
        httponly=True,
        samesite=_settings.cookie_samesite,
        secure=_settings.cookie_secure,
        path="/",
    )
    response.set_cookie(
        _settings.csrf_cookie_name,
        raw_csrf,
        max_age=max_age,
        httponly=False,
        samesite=_settings.cookie_samesite,
        secure=_settings.cookie_secure,
        path="/",
    )


@router.post("/dev-login", response_model=LoginResponse)
async def dev_login(
    payload: DevLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user, raw_token, raw_csrf = await service.dev_login(db, payload.email)
    _set_auth_cookies(response, raw_token, raw_csrf)
    return LoginResponse(user=user, csrf_token=raw_csrf)


@router.get("/me", response_model=UserPublic)
async def me(ctx: AuthContext = Depends(get_current_context)) -> UserPublic:
    return service.serialize_user(ctx.user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await service.logout(db, ctx.session)
    response.delete_cookie(_settings.session_cookie_name, path="/")
    response.delete_cookie(_settings.csrf_cookie_name, path="/")
    return MessageResponse(detail="Signed out.")
