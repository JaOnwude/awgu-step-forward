from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.features.providers.models import PROVIDER_TYPES


class ProviderRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    provider_type: str
    public_contact: str = Field(min_length=3, max_length=320)
    operating_area: str = Field(min_length=2, max_length=200)
    evidence_type: str | None = Field(default=None, max_length=64)
    evidence_reference: str | None = Field(default=None, max_length=2000)

    @field_validator("provider_type")
    @classmethod
    def _validate_provider_type(cls, value: str) -> str:
        if value not in PROVIDER_TYPES:
            raise ValueError(
                f"Unknown provider_type. Allowed: {', '.join(PROVIDER_TYPES)}"
            )
        return value


class ProviderView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    provider_type: str
    operating_area: str
    verification_status: str
    verified_at: datetime | None = None
    created_at: datetime


class MemberView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    role: str
    status: str
    created_at: datetime


class ProviderDetail(ProviderView):
    public_contact: str
    recheck_at: datetime | None = None
    members: list[MemberView] = Field(default_factory=list)


class VerificationDecisionRequest(BaseModel):
    decision: Literal["approve", "reject", "suspend", "restore"]
    rationale: str = Field(min_length=3, max_length=2000)
    recheck_days: int | None = Field(default=None, ge=1, le=3650)
