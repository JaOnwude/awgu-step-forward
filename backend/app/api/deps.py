from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AuthRequiredError, PermissionDeniedError
from app.core.security import hash_token, safe_equals
from app.db.session import get_db
from app.features.identity import service
from app.features.identity.models import User, UserSession

_settings = get_settings()


@dataclass
class AuthContext:
    user: User
    session: UserSession

    @property
    def roles(self) -> set[str]:
        return set(self.user.role_names)


async def get_current_context(
    request: Request, db: AsyncSession = Depends(get_db)
) -> AuthContext:
    raw_token = request.cookies.get(_settings.session_cookie_name)
    if not raw_token:
        raise AuthRequiredError()
    resolved = await service.resolve_session(db, raw_token)
    if resolved is None:
        raise AuthRequiredError()
    user, session = resolved
    context = AuthContext(user=user, session=session)
    request.state.auth = context
    return context


def require_roles(*roles: str):
    async def _dependency(
        ctx: AuthContext = Depends(get_current_context),
    ) -> AuthContext:
        if not (ctx.roles & set(roles)):
            raise PermissionDeniedError()
        return ctx

    return _dependency


async def verify_csrf(
    request: Request, ctx: AuthContext = Depends(get_current_context)
) -> AuthContext:
    provided = request.headers.get("X-CSRF-Token")
    if not provided or not safe_equals(
        hash_token(provided), ctx.session.csrf_token_hash
    ):
        raise PermissionDeniedError(
            "Invalid or missing CSRF token.", code="csrf_failed"
        )
    return ctx
