from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.features.applicant.models import EDUCATION_LEVELS


class ApplicantProfileView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    preferred_name: str
    date_of_birth: date
    age_band: str
    is_minor: bool
    lga: str | None = None
    community: str | None = None
    education_level: str | None = None
    interests: str | None = None
    skills: str | None = None
    experience: str | None = None
    updated_at: datetime


class ApplicantProfileUpdate(BaseModel):
    preferred_name: str = Field(min_length=2, max_length=120)
    date_of_birth: date
    lga: str | None = Field(default=None, max_length=120)
    community: str | None = Field(default=None, max_length=120)
    education_level: str | None = Field(default=None, max_length=64)
    interests: str | None = Field(default=None, max_length=500)
    skills: str | None = Field(default=None, max_length=500)
    experience: str | None = Field(default=None, max_length=4000)

    @field_validator("education_level")
    @classmethod
    def _validate_education(cls, value: str | None) -> str | None:
        if value is not None and value not in EDUCATION_LEVELS:
            raise ValueError(
                f"Unknown education_level. Allowed: {', '.join(EDUCATION_LEVELS)}"
            )
        return value


class SavedListingView(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    title: str
    location: str
    opportunity_type: str
    is_expired: bool
    saved_at: datetime


class SavedListingCreate(BaseModel):
    opportunity_id: uuid.UUID
