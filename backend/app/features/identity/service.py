from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import (
    AuthRequiredError,
    RateLimitedError,
    ServiceUnavailableError,
    ValidationError,
)
from app.core.security import generate_token, hash_token, safe_equals
from app.features.identity import repository as repo
from app.features.identity.emails import sign_in_code_email
from app.features.identity.models import OtpChallenge, User, UserSession
from app.features.identity.schemas import UserPublic
from app.integrations.messaging import (
    AdapterNotConfiguredError,
    OutgoingMessage,
    email_delivers,
    get_email_adapter,
    sms_delivers,
)

logger = logging.getLogger("awgu.identity")

_settings = get_settings()

OTP_CHANNELS = ("email", "phone")
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_PURPOSE = "signup_login"


def serialize_user(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        phone=user.phone,
        account_status=user.account_status,
        roles=user.role_names,
        created_at=user.created_at,
        avatar_url=(
            f"/api/v1/me/avatar?v={int(user.avatar_updated_at.timestamp())}"
            if user.avatar_updated_at
            else None
        ),
    )


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _normalize(channel: str, destination: str) -> str:
    destination = destination.strip()
    return destination.lower() if channel == "email" else destination


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def _issue_session(db: AsyncSession, user: User) -> tuple[str, str]:
    """Create a session. Returns (raw_session_token, raw_csrf_token)."""
    raw_token = generate_token()
    raw_csrf = generate_token()
    expires_at = datetime.now(UTC) + timedelta(hours=_settings.session_ttl_hours)
    await repo.create_session(
        db,
        user_id=user.id,
        token_hash=hash_token(raw_token),
        csrf_token_hash=hash_token(raw_csrf),
        expires_at=expires_at,
    )
    return raw_token, raw_csrf


async def dev_login(db: AsyncSession, email: str) -> tuple[UserPublic, str, str]:
    """Development-only sign-in. Returns (user, raw_session_token, raw_csrf_token)."""
    if not _settings.dev_auth_enabled:
        raise AuthRequiredError("Developer sign-in is disabled.")

    email = email.strip().lower()
    user = await repo.get_user_by_email(db, email)
    if user is None:
        user = await repo.create_user(
            db, email=email, email_verified_at=datetime.now(UTC)
        )
        await repo.ensure_role(db, user.id, "applicant")

    raw_token, raw_csrf = await _issue_session(db, user)
    await db.commit()
    await db.refresh(user)
    return serialize_user(user), raw_token, raw_csrf


def _delivers(channel: str) -> bool:
    return email_delivers() if channel == "email" else sms_delivers()


async def _send_code_email(to: str, code: str) -> bool:
    subject, text, html = sign_in_code_email(code, OTP_TTL_MINUTES)
    try:
        adapter = get_email_adapter()
    except AdapterNotConfiguredError:
        logger.error("Email sign-in codes are enabled but the provider is not set up.")
        return False
    result = await adapter.send(
        OutgoingMessage(to=to, subject=subject, body=text, html=html)
    )
    return result.ok


async def request_otp(
    db: AsyncSession, *, channel: str, destination: str
) -> tuple[OtpChallenge, str | None]:
    """Create an OTP challenge and deliver the code.

    Email codes are really sent when an email provider is configured. When a
    channel can't deliver (console adapters) the code is only returned in
    demo mode (DEV_AUTH_ENABLED), so it can be shown on screen, clearly
    labelled; otherwise that channel is refused.
    """
    if channel not in OTP_CHANNELS:
        raise ValidationError("channel must be 'email' or 'phone'.")

    normalized = _normalize(channel, destination)
    if not normalized:
        raise ValidationError("A destination is required.")
    if channel == "email" and ("@" not in normalized or "." not in normalized):
        raise ValidationError("Enter a valid email address.")

    delivers = _delivers(channel)
    if not delivers and not _settings.dev_auth_enabled:
        if channel == "phone":
            raise ValidationError(
                "Phone sign-in isn't available yet. Please use your email address.",
                code="phone_unavailable",
            )
        raise ServiceUnavailableError(
            "Email sign-in isn't set up on this server yet.",
            code="email_unavailable",
        )

    now = datetime.now(UTC)
    existing = await repo.latest_otp_challenge(
        db, channel=channel, destination=normalized, purpose=OTP_PURPOSE
    )
    if existing is not None:
        age = now - _as_aware(existing.created_at)
        if age < timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS):
            raise RateLimitedError("Please wait before requesting another code.")

    code = _generate_code()
    challenge = await repo.create_otp_challenge(
        db,
        channel=channel,
        destination=normalized,
        code_hash=hash_token(code),
        purpose=OTP_PURPOSE,
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        max_attempts=OTP_MAX_ATTEMPTS,
    )
    await db.commit()
    await db.refresh(challenge)

    if channel == "email" and delivers:
        if not await _send_code_email(normalized, code):
            # Remove the challenge so the resend cooldown doesn't block a retry.
            await db.delete(challenge)
            await db.commit()
            raise ServiceUnavailableError(
                "We couldn't send the email just now. Check the address and try "
                "again in a minute.",
                code="email_send_failed",
            )
        return challenge, None

    # Not delivered anywhere: only reachable in demo mode (checked above).
    return challenge, code


async def verify_otp(
    db: AsyncSession, *, channel: str, destination: str, code: str
) -> tuple[UserPublic, str, str]:
    """Verify an OTP and sign the applicant in."""
    if channel not in OTP_CHANNELS:
        raise ValidationError("channel must be 'email' or 'phone'.")

    normalized = _normalize(channel, destination)
    challenge = await repo.latest_otp_challenge(
        db, channel=channel, destination=normalized, purpose=OTP_PURPOSE
    )
    if challenge is None:
        raise ValidationError("Request a new code and try again.")

    now = datetime.now(UTC)
    if _as_aware(challenge.expires_at) < now:
        raise ValidationError("That code has expired. Request a new one.")
    if challenge.attempts >= challenge.max_attempts:
        raise RateLimitedError("Too many attempts. Request a new code.")
    if not safe_equals(hash_token(code), challenge.code_hash):
        challenge.attempts += 1
        await db.commit()
        raise ValidationError("Incorrect code.")

    challenge.consumed_at = now

    if channel == "email":
        user = await repo.get_user_by_email(db, normalized)
        if user is None:
            user = await repo.create_user(db, email=normalized, email_verified_at=now)
        else:
            user.email_verified_at = now
    else:
        user = await repo.get_user_by_phone(db, normalized)
        if user is None:
            user = await repo.create_user(db, phone=normalized, phone_verified_at=now)
        else:
            user.phone_verified_at = now

    await repo.ensure_role(db, user.id, "applicant")
    raw_token, raw_csrf = await _issue_session(db, user)
    await db.commit()
    await db.refresh(user)
    return serialize_user(user), raw_token, raw_csrf


async def resolve_session(
    db: AsyncSession, raw_token: str
) -> tuple[User, UserSession] | None:
    session = await repo.get_session_by_token_hash(db, hash_token(raw_token))
    if session is None or not session.is_active:
        return None
    user = await repo.get_user_by_id(db, session.user_id)
    if user is None or user.account_status != "active":
        return None
    return user, session


async def logout(db: AsyncSession, session: UserSession) -> None:
    await repo.revoke_session(db, session)
    await db.commit()
