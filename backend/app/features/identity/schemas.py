from __future__ import annotations

import uuid
from datetime import datetime

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


class LoginResponse(BaseModel):
    user: UserPublic
    csrf_token: str


class MessageResponse(BaseModel):
    detail: str
