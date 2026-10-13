from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.features.identity.models import utcnow

OPPORTUNITY_TYPES = (
    "training",
    "apprenticeship",
    "scholarship",
    "employment",
    "local_work",
    "contract",
)

DELIVERY_MODES = ("onsite", "hybrid", "remote")

APPLICATION_ROUTES = ("platform", "external", "in_person")

OPPORTUNITY_STATUSES = (
    "draft",
    "pending_review",
    "changes_requested",
    "approved",
    "rejected",
    "suspended",
    "expired",
)

#: Fields whose change on an approved listing must return it to review.
MATERIAL_FIELDS = (
    "cost_details",
    "deadline_at",
    "eligibility",
    "application_route",
    "min_age",
)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    opportunity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    eligibility: Mapped[str | None] = mapped_column(Text)
    cost_details: Mapped[str | None] = mapped_column(Text)
    pay_details: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    delivery_mode: Mapped[str] = mapped_column(
        String(16), default="onsite", nullable=False
    )
    application_route: Mapped[str] = mapped_column(
        String(16), default="platform", nullable=False
    )
    external_url: Mapped[str | None] = mapped_column(String(500))
    min_age: Mapped[int | None] = mapped_column(Integer)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(
        String(32), default="draft", nullable=False, index=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    revisions: Mapped[list[ListingRevision]] = relationship(
        back_populates="opportunity",
        cascade="all, delete-orphan",
        order_by="ListingRevision.revision_number",
    )


class ListingRevision(Base):
    __tablename__ = "listing_revisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    decision: Mapped[str] = mapped_column(
        String(32), default="pending", nullable=False
    )
    decision_reason: Mapped[str | None] = mapped_column(Text)
    reviewer_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    opportunity: Mapped[Opportunity] = relationship(back_populates="revisions")
