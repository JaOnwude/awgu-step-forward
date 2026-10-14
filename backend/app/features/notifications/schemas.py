from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PreferencesView(BaseModel):
    email_enabled: bool
    sms_enabled: bool
    deadline_reminders: bool
    session_reminders: bool
    marketing_opt_in: bool
    #: Whether the account has a verified destination for each channel.
    email_available: bool
    sms_available: bool


class PreferencesUpdate(BaseModel):
    email_enabled: bool
    sms_enabled: bool
    deadline_reminders: bool
    session_reminders: bool
    marketing_opt_in: bool = False


class NotificationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    purpose: str
    subject: str
    body: str
    link: str | None = None
    created_at: datetime
    read_at: datetime | None = None


class NotificationList(BaseModel):
    items: list[NotificationView]
    unread: int


class ReminderRunResult(BaseModel):
    deadline_reminders: int
    session_reminders: int
