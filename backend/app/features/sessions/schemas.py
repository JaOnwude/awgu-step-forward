from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.features.sessions.models import MAX_CAPACITY


class SessionCreate(BaseModel):
    organization_id: uuid.UUID | None = None
    topic: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=4000)
    starts_at: datetime
    ends_at: datetime
    delivery_mode: Literal["onsite", "remote", "hybrid"] = "onsite"
    location: str = Field(min_length=2, max_length=200)
    capacity: int = Field(ge=1, le=MAX_CAPACITY)
    accessibility_notes: str | None = Field(default=None, max_length=2000)
    age_suitability: Literal["adults", "all_ages"] = "adults"
    organizer_contact: str = Field(min_length=3, max_length=200)

    @model_validator(mode="after")
    def _ends_after_start(self) -> SessionCreate:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at.")
        return self


class ProviderBrief(BaseModel):
    id: uuid.UUID
    name: str
    verification_status: str


class SessionOut(BaseModel):
    """Public view of a session. Contains no registrant data."""

    id: uuid.UUID
    organization_id: uuid.UUID
    provider: ProviderBrief | None = None
    topic: str
    description: str
    starts_at: datetime
    ends_at: datetime
    delivery_mode: str
    location: str
    capacity: int
    seats_left: int
    is_full: bool
    #: True once the session has begun; registration and cancelling close then.
    has_started: bool
    accessibility_notes: str | None = None
    age_suitability: str
    organizer_contact: str
    status: str


class SessionManageOut(SessionOut):
    """Organizer/staff view: adds review state and the registration count."""

    registered_count: int
    decision_reason: str | None = None
    submitted_at: datetime
    reviewed_at: datetime | None = None


class SessionListResponse(BaseModel):
    items: list[SessionOut]
    total: int
    page: int
    page_size: int


class RegistrationCreate(BaseModel):
    reminder_opt_in: bool = False


class RegistrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    status: str
    attendance: str
    reminder_opt_in: bool
    registered_at: datetime
    cancelled_at: datetime | None = None


class MyRegistration(RegistrationOut):
    session: SessionOut


class RosterEntry(BaseModel):
    """Only what an organizer needs to run the session (spec R38)."""

    registration_id: uuid.UUID
    preferred_name: str
    status: str
    attendance: str
    registered_at: datetime


class Roster(BaseModel):
    session: SessionManageOut
    entries: list[RosterEntry]


class AttendanceUpdate(BaseModel):
    attendance: Literal["unknown", "attended", "absent"]


class SessionDecisionRequest(BaseModel):
    decision: Literal["approve", "reject", "suspend"]
    reason: str | None = Field(default=None, max_length=2000)
