from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FormQuestion(BaseModel):
    key: str
    label: str
    type: str
    required: bool
    options: list[str] | None = None


class ApplicationFormView(BaseModel):
    opportunity_id: uuid.UUID
    form_version: str
    questions: list[FormQuestion]


class ApplicationAnswerIn(BaseModel):
    question_key: str = Field(min_length=1, max_length=64)
    answer_value: str | None = Field(default=None, max_length=4000)


class ApplicationCreate(BaseModel):
    opportunity_id: uuid.UUID


class ApplicationUpdate(BaseModel):
    answers: list[ApplicationAnswerIn] = Field(default_factory=list)


class ApplicationAnswerView(BaseModel):
    question_key: str
    answer_value: str | None = None


class ApplicationStatusEventView(BaseModel):
    from_status: str | None = None
    to_status: str
    source: str
    note: str | None = None
    created_at: datetime


class ApplicationSummary(BaseModel):
    id: uuid.UUID
    reference: str
    opportunity_id: uuid.UUID
    opportunity_title: str
    #: "platform" (submitted here) or "external"/"in_person" (applicant-tracked).
    route: str
    status: str
    status_source: str
    submitted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ApplicationDetail(ApplicationSummary):
    form_version: str
    private_note: str | None = None
    answers: list[ApplicationAnswerView] = Field(default_factory=list)
    history: list[ApplicationStatusEventView] = Field(default_factory=list)


class ApplicationReceipt(BaseModel):
    id: uuid.UUID
    reference: str
    status: str
    submitted_at: datetime | None = None
    message: str


class ApplicationWithdrawRequest(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class TrackedApplicationCreate(BaseModel):
    opportunity_id: uuid.UUID


class TrackingUpdate(BaseModel):
    """Applicant-reported progress on an application made elsewhere."""

    status: Literal[
        "started",
        "submitted",
        "interview",
        "offered",
        "accepted",
        "rejected",
        "withdrawn",
        "completed",
    ]
    private_note: str | None = Field(default=None, max_length=2000)
