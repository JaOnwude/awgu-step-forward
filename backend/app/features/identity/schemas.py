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


class DevLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class OtpRequest(BaseModel):
    channel: Literal["email", "phone"]
    destination: str = Field(min_length=3, max_length=320)


class OtpRequestResponse(BaseModel):
    channel: str
    destination: str
    expires_at: datetime
    dev_code: str | None = None


class OtpVerifyRequest(BaseModel):
    channel: Literal["email", "phone"]
    destination: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=4, max_length=12)


class LoginResponse(BaseModel):
    user: UserPublic
    csrf_token: str


class MessageResponse(BaseModel):
    detail: str
