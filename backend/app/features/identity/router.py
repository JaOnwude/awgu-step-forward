from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.config import get_settings
from app.db.session import get_db
from app.features.identity import service
from app.features.identity.schemas import (
    AuthConfig,
    DevLoginRequest,
    LoginResponse,
    MessageResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    UserPublic,
)
from app.integrations.messaging import email_delivers, sms_delivers

_settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, raw_token: str, raw_csrf: str) -> None:
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


@router.get("/config", response_model=AuthConfig)
async def auth_config() -> AuthConfig:
    demo = get_settings().dev_auth_enabled
    return AuthConfig(
        demo_mode=demo,
        email_codes_delivered=email_delivers(),
        phone_sign_in=sms_delivers() or demo,
    )


@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(
    payload: OtpRequest,
    db: AsyncSession = Depends(get_db),
) -> OtpRequestResponse:
    challenge, dev_code = await service.request_otp(
        db, channel=payload.channel, destination=payload.destination
    )
    return OtpRequestResponse(
        channel=challenge.channel,
        destination=challenge.destination,
        expires_at=challenge.expires_at,
        dev_code=dev_code,
    )


@router.post("/otp/verify", response_model=LoginResponse)
async def verify_otp(
    payload: OtpVerifyRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user, raw_token, raw_csrf = await service.verify_otp(
        db,
        channel=payload.channel,
        destination=payload.destination,
        code=payload.code,
    )
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
