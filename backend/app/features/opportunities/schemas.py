from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.features.opportunities.models import (
    APPLICATION_ROUTES,
    DELIVERY_MODES,
    OPPORTUNITY_TYPES,
)


class OpportunityCreate(BaseModel):
    organization_id: uuid.UUID | None = None
    opportunity_type: str
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    eligibility: str | None = None
    cost_details: str | None = None
    pay_details: str | None = None
    location: str = Field(min_length=2, max_length=200)
    delivery_mode: str = "onsite"
    application_route: str = "platform"
    external_url: str | None = Field(default=None, max_length=500)
    min_age: int | None = Field(default=None, ge=10, le=100)
    deadline_at: datetime | None = None

    @field_validator("opportunity_type")
    @classmethod
    def _validate_type(cls, value: str) -> str:
        if value not in OPPORTUNITY_TYPES:
            raise ValueError(
                f"Unknown opportunity_type. Allowed: {', '.join(OPPORTUNITY_TYPES)}"
            )
        return value

    @field_validator("delivery_mode")
    @classmethod
    def _validate_delivery_mode(cls, value: str) -> str:
        if value not in DELIVERY_MODES:
            raise ValueError(
                f"Unknown delivery_mode. Allowed: {', '.join(DELIVERY_MODES)}"
            )
        return value

    @field_validator("application_route")
    @classmethod
    def _validate_route(cls, value: str) -> str:
        if value not in APPLICATION_ROUTES:
            raise ValueError(
                f"Unknown application_route. Allowed: {', '.join(APPLICATION_ROUTES)}"
            )
        return value


class OpportunityUpdate(BaseModel):
    opportunity_type: str | None = None
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=10)
    eligibility: str | None = None
    cost_details: str | None = None
    pay_details: str | None = None
    location: str | None = Field(default=None, min_length=2, max_length=200)
    delivery_mode: str | None = None
    application_route: str | None = None
    external_url: str | None = Field(default=None, max_length=500)
    min_age: int | None = Field(default=None, ge=10, le=100)
    deadline_at: datetime | None = None

    @field_validator("opportunity_type")
    @classmethod
    def _validate_type(cls, value: str | None) -> str | None:
        if value is not None and value not in OPPORTUNITY_TYPES:
            raise ValueError(
                f"Unknown opportunity_type. Allowed: {', '.join(OPPORTUNITY_TYPES)}"
            )
        return value

    @field_validator("delivery_mode")
    @classmethod
    def _validate_delivery_mode(cls, value: str | None) -> str | None:
        if value is not None and value not in DELIVERY_MODES:
            raise ValueError(
                f"Unknown delivery_mode. Allowed: {', '.join(DELIVERY_MODES)}"
            )
        return value

    @field_validator("application_route")
    @classmethod
    def _validate_route(cls, value: str | None) -> str | None:
        if value is not None and value not in APPLICATION_ROUTES:
            raise ValueError(
                f"Unknown application_route. Allowed: {', '.join(APPLICATION_ROUTES)}"
            )
        return value


class OpportunityView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    opportunity_type: str
    title: str
    description: str
    eligibility: str | None = None
    cost_details: str | None = None
    pay_details: str | None = None
    location: str
    delivery_mode: str
    application_route: str
    external_url: str | None = None
    min_age: int | None = None
    deadline_at: datetime | None = None
    status: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    published_at: datetime | None = None
    decision_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class ModerationDecisionRequest(BaseModel):
    decision: Literal["approve", "reject", "request_changes", "suspend"]
    reason: str | None = Field(default=None, max_length=2000)
