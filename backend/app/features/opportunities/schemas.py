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


class WorkTermsCreate(BaseModel):
    task_scope: str | None = Field(default=None, max_length=4000)
    pay_rate: str | None = Field(default=None, max_length=200)
    payment_timing: str | None = Field(default=None, max_length=100)
    hours_expected: str | None = Field(default=None, max_length=100)
    work_dates: str | None = Field(default=None, max_length=200)
    worksite: str | None = Field(default=None, max_length=200)
    supervisor_contact: str | None = Field(default=None, max_length=200)
    safety_ppe: str | None = Field(default=None, max_length=4000)
    hazards_reviewed: bool = False
    adult_only_construction: bool = False


class WorkTermsUpdate(BaseModel):
    task_scope: str | None = Field(default=None, max_length=4000)
    pay_rate: str | None = Field(default=None, max_length=200)
    payment_timing: str | None = Field(default=None, max_length=100)
    hours_expected: str | None = Field(default=None, max_length=100)
    work_dates: str | None = Field(default=None, max_length=200)
    worksite: str | None = Field(default=None, max_length=200)
    supervisor_contact: str | None = Field(default=None, max_length=200)
    safety_ppe: str | None = Field(default=None, max_length=4000)
    hazards_reviewed: bool | None = None
    adult_only_construction: bool | None = None


class WorkTermsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_scope: str | None
    pay_rate: str | None
    payment_timing: str | None
    hours_expected: str | None
    work_dates: str | None
    worksite: str | None
    supervisor_contact: str | None
    safety_ppe: str | None
    hazards_reviewed: bool
    adult_only_construction: bool


class ProviderRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    verification_status: str
    verified_at: datetime | None = None
    public_contact: str | None = None


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
    work_terms: WorkTermsCreate | None = None

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
    work_terms: WorkTermsUpdate | None = None

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


class OpportunityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    opportunity_type: str
    title: str
    location: str
    delivery_mode: str
    cost_details: str | None = None
    pay_details: str | None = None
    deadline_at: datetime | None = None
    status: str
    application_route: str
    external_url: str | None = None
    min_age: int | None = None
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    published_at: datetime | None = None
    decision_reason: str | None = None


class OpportunitySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    organization_id: uuid.UUID
    status: str
    opportunity_type: str


class OpportunityCard(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    opportunity_type: str
    title: str
    location: str
    delivery_mode: str
    cost_details: str | None = None
    pay_details: str | None = None
    deadline_at: datetime | None = None
    status: str
    is_expired: bool = False
    is_closing_soon: bool = False
    image_url: str | None = None
    is_featured: bool = False
    # Set when the listing was copied from a public announcement.
    source_url: str | None = None
    updated_at: datetime
    provider: ProviderRef | None = None


class OpportunityListResponse(BaseModel):
    items: list[OpportunityCard]
    total: int
    page: int
    page_size: int


class OpportunityDetail(OpportunityCard):
    description: str
    eligibility: str | None = None
    application_route: str
    external_url: str | None = None
    min_age: int | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    published_at: datetime | None = None
    decision_reason: str | None = None
    work_terms: WorkTermsOut | None = None


class ModerationDecisionRequest(BaseModel):
    decision: Literal[
        "approve", "reject", "request_changes", "suspend", "restore", "expire"
    ]
    reason: str | None = Field(default=None, max_length=2000)

OpportunityView = OpportunityOut
