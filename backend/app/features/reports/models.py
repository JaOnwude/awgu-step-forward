from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.features.identity.models import utcnow

REPORT_TARGETS = ("opportunity", "support_session")

REPORT_CATEGORIES = (
    "fee_request",
    "fraud",
    "unsafe",
    "harassment",
    "discrimination",
    "inaccurate",
    "expired",
    "other",
)

#: Categories that need same-day triage (spec R45).
URGENT_CATEGORIES = frozenset({"fee_request", "fraud", "unsafe", "harassment"})

REPORT_STATUSES = ("open", "resolved", "dismissed")


class Report(Base):
    """A visitor or applicant's report about a listing or session (spec R21)."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    details: Mapped[str | None] = mapped_column(Text)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default="open", nullable=False, index=True
    )
    #: Optional: anonymous reports are allowed.
    reporter_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    #: Salted hash of the reporter's network address, for rate limiting only.
    reporter_fingerprint: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )
    resolution: Mapped[str | None] = mapped_column(String(32))
    resolution_note: Mapped[str | None] = mapped_column(Text)
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
