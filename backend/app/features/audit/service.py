from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.audit.models import AuditEvent


async def record_event(
    db: AsyncSession,
    *,
    action: str,
    actor_user_id: uuid.UUID | None = None,
    target_type: str | None = None,
    target_id: str | uuid.UUID | None = None,
    request_id: str | None = None,
    metadata: dict | None = None,
) -> AuditEvent:
    """Append an audit event. Caller is responsible for committing."""
    event = AuditEvent(
        action=action,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        request_id=request_id,
        redacted_metadata=metadata,
    )
    db.add(event)
    await db.flush()
    return event
