from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AuthRequiredError
from app.core.security import generate_token, hash_token
from app.features.identity import repository as repo
from app.features.identity.models import User, UserSession
from app.features.identity.schemas import UserPublic

_settings = get_settings()


def serialize_user(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        phone=user.phone,
        account_status=user.account_status,
        roles=user.role_names,
        created_at=user.created_at,
    )


async def dev_login(
    db: AsyncSession, email: str
) -> tuple[UserPublic, str, str]:
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

    raw_token = generate_token()
    raw_csrf = generate_token()
    expires_at = datetime.now(UTC) + timedelta(
        hours=_settings.session_ttl_hours
    )
    await repo.create_session(
        db,
        user_id=user.id,
        token_hash=hash_token(raw_token),
        csrf_token_hash=hash_token(raw_csrf),
        expires_at=expires_at,
    )
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
