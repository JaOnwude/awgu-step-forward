from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.identity.models import User, UserRole, UserSession


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    account_status: str = "active",
    email_verified_at: datetime | None = None,
) -> User:
    user = User(
        email=email,
        account_status=account_status,
        email_verified_at=email_verified_at,
    )
    db.add(user)
    await db.flush()
    return user


async def ensure_role(db: AsyncSession, user_id: uuid.UUID, role: str) -> UserRole:
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role == role,
            UserRole.revoked_at.is_(None),
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing
    user_role = UserRole(user_id=user_id, role=role)
    db.add(user_role)
    await db.flush()
    return user_role


async def create_session(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    token_hash: str,
    csrf_token_hash: str,
    expires_at: datetime,
) -> UserSession:
    session = UserSession(
        user_id=user_id,
        token_hash=token_hash,
        csrf_token_hash=csrf_token_hash,
        expires_at=expires_at,
    )
    db.add(session)
    await db.flush()
    return session


async def get_session_by_token_hash(
    db: AsyncSession, token_hash: str
) -> UserSession | None:
    result = await db.execute(
        select(UserSession).where(UserSession.token_hash == token_hash)
    )
    return result.scalar_one_or_none()


async def revoke_session(db: AsyncSession, session: UserSession) -> None:
    session.revoked_at = datetime.now(UTC)
    await db.flush()
