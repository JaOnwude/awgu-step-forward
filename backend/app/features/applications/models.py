from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.features.identity.models import utcnow

APPLICATION_STATUSES = (
    "draft",
    "submitted",
    "under_review",
    "interview",
    "offered",
    "accepted",
    "rejected",
    "withdrawn",
    "closed",
)

APPLICATION_STATUS_SOURCES = ("applicant", "provider", "staff")

#: Statuses in which an applicant may still edit answers.
EDITABLE_STATUSES = ("draft",)

#: Statuses from which an applicant may withdraw.
WITHDRAWABLE_STATUSES = ("draft", "submitted", "under_review")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint(
            "applicant_user_id",
            "opportunity_id",
            name="uq_application_applicant_listing",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    applicant_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    route: Mapped[str] = mapped_column(
        String(16), default="platform", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default="draft", nullable=False, index=True
    )
    status_source: Mapped[str] = mapped_column(
        String(16), default="applicant", nullable=False
    )
    form_version: Mapped[str] = mapped_column(
        String(16), default="v1", nullable=False
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(64), unique=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_snapshot: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    answers: Mapped[list[ApplicationAnswer]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
    )
    events: Mapped[list[ApplicationStatusEvent]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusEvent.created_at",
    )


class ApplicationAnswer(Base):
    __tablename__ = "application_answers"
    __table_args__ = (
        UniqueConstraint(
            "application_id", "question_key", name="uq_application_answer_key"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    question_key: Mapped[str] = mapped_column(String(64), nullable=False)
    answer_value: Mapped[str | None] = mapped_column(Text)
    access_classification: Mapped[str] = mapped_column(
        String(32), default="shared_with_provider", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    application: Mapped[Application] = relationship(back_populates="answers")


class ApplicationStatusEvent(Base):
    __tablename__ = "application_status_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    from_status: Mapped[str | None] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    application: Mapped[Application] = relationship(back_populates="events")
