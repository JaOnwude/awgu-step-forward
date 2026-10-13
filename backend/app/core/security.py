from __future__ import annotations

import hashlib
import secrets


def generate_token(nbytes: int = 32) -> str:
    """Return a URL-safe random token for sessions and CSRF values."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Hash a bearer token for at-rest storage. Never store the raw token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def safe_equals(left: str, right: str) -> bool:
    """Constant-time comparison for secrets."""
    return secrets.compare_digest(left, right)
