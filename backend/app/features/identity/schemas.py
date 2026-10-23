from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None = None
    phone: str | None = None
    account_status: str
    roles: list[str] = Field(default_factory=list)
    created_at: datetime
    # Own profile picture, versioned so browsers refetch after a change.
    avatar_url: str | None = None
    email_verified: bool = False
    has_password: bool = False


class DevLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class OtpRequest(BaseModel):
    channel: Literal["email", "phone"]
    destination: str = Field(min_length=3, max_length=320)


class AuthConfig(BaseModel):
    """What the sign-in page should offer on this server."""

    # Demo accounts and on-screen codes (DEV_AUTH_ENABLED). Off for real users.
    demo_mode: bool
    # True when email codes are really sent (not just logged).
    email_codes_delivered: bool
    # Phone sign-in works: real SMS, or demo mode showing the code on screen.
    phone_sign_in: bool


class OtpRequestResponse(BaseModel):
    channel: str
    destination: str
    expires_at: datetime
    dev_code: str | None = None


class OtpVerifyRequest(BaseModel):
    channel: Literal["email", "phone"]
    destination: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=4, max_length=12)


class PasswordSignIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    # Length rules are checked in the service, with friendlier messages.
    password: str = Field(min_length=1, max_length=256)


class SetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=1, max_length=256)
    current_password: str | None = Field(default=None, max_length=256)


class LoginResponse(BaseModel):
    user: UserPublic
    csrf_token: str


class MessageResponse(BaseModel):
    detail: str
