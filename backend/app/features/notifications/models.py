from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.features.identity.models import utcnow

CHANNELS = ("in_app", "email", "sms")
DELIVERY_STATES = ("pending", "sent", "failed")


class NotificationPreference(Base):
    """Per-user channel and reminder choices (spec R35).

    Channel choice is separate from service consent, and marketing is a
    separate opt-in that defaults to off.
    """

    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deadline_reminders: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    session_reminders: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    marketing_opt_in: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class Notification(Base):
    """One message on one channel. In-app rows double as the delivery log."""

    __tablename__ = "notifications"
    __table_args__ = (
        # The same reminder is never sent twice on the same channel (R36).
        UniqueConstraint("dedupe_key", "channel", name="uq_notification_dedupe"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    purpose: Mapped[str] = mapped_column(String(40), nullable=False)
    dedupe_key: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    provider: Mapped[str | None] = mapped_column(String(40))
    error: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
