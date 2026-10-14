from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ReportCategory = Literal[
    "fee_request",
    "fraud",
    "unsafe",
    "harassment",
    "discrimination",
    "inaccurate",
    "expired",
    "other",
]


class ReportCreate(BaseModel):
    target_type: Literal["opportunity", "support_session"]
    target_id: uuid.UUID
    category: ReportCategory
    details: str | None = Field(default=None, max_length=2000)


class ReportReceipt(BaseModel):
    id: uuid.UUID
    message: str


class ReportView(BaseModel):
    """Staff view. Never includes the reporter's identity or fingerprint."""

    id: uuid.UUID
    target_type: str
    target_id: uuid.UUID
    target_title: str
    category: str
    details: str | None = None
    urgent: bool
    status: str
    age_hours: int
    overdue: bool
    signed_in_reporter: bool
    resolution: str | None = None
    resolution_note: str | None = None
    created_at: datetime


class ReportDecision(BaseModel):
    action: Literal["resolve", "dismiss", "suspend_target"]
    note: str = Field(min_length=3, max_length=2000)
