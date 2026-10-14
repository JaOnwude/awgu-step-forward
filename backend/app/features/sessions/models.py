from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.features.identity.models import utcnow

SESSION_STATUSES = ("pending_review", "approved", "rejected", "suspended")
SESSION_DELIVERY_MODES = ("onsite", "remote", "hybrid")

#: Week 1 runs adults only (DECISIONS D7); "all_ages" is stored for later but
#: registration still requires an adult profile until guardian flows exist.
AGE_SUITABILITY = ("adults", "all_ages")

REGISTRATION_STATUSES = ("registered", "cancelled")
ATTENDANCE_STATES = ("unknown", "attended", "absent")

MAX_CAPACITY = 500


class ApplicationSupportSession(Base):
    """A group workshop or help desk that helps people prepare applications."""

    __tablename__ = "application_support_sessions"
    __table_args__ = (CheckConstraint("capacity > 0", name="capacity_positive"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivery_mode: Mapped[str] = mapped_column(
        String(16), default="onsite", nullable=False
    )
    #: Venue area or remote method. Never a private home address.
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    accessibility_notes: Mapped[str | None] = mapped_column(Text)
    age_suitability: Mapped[str] = mapped_column(
        String(16), default="adults", nullable=False
    )
    organizer_contact: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="pending_review", nullable=False, index=True
    )
    decision_reason: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    registrations: Mapped[list[SessionRegistration]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class SessionRegistration(Base):
    __tablename__ = "session_registrations"
    __table_args__ = (
        UniqueConstraint("session_id", "user_id", name="uq_session_registration"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("application_support_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), default="registered", nullable=False
    )
    attendance: Mapped[str] = mapped_column(
        String(16), default="unknown", nullable=False
    )
    reminder_opt_in: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    session: Mapped[ApplicationSupportSession] = relationship(
        back_populates="registrations"
    )
