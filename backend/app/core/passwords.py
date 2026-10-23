from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# argon2-cffi's defaults follow the RFC 9106 low-memory profile.
_hasher = PasswordHasher()

# Checked when no account matches, so a missing email takes as long to
# answer as a wrong password and the timing gives nothing away.
_DUMMY_HASH = _hasher.hash("not-a-real-password")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and (
            password_hash is not None
        )
    except (VerificationError, InvalidHashError):
        return False


def password_problem(password: str, email: str | None = None) -> str | None:
    """Why a new password can't be used, or None if it's fine."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Use at least {PASSWORD_MIN_LENGTH} characters."
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"Use at most {PASSWORD_MAX_LENGTH} characters."
    if not password.strip():
        return "A password can't be only spaces."
    if email and password.strip().lower() == email.strip().lower():
        return "Don't use your email address as your password."
    return None
