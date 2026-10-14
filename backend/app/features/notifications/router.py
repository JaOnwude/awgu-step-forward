from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.errors import PermissionDeniedError
from app.core.roles import STAFF_ROLES
from app.db.session import get_db
from app.features.audit.service import record_event
from app.features.notifications import service
from app.features.notifications.schemas import (
    NotificationList,
    PreferencesUpdate,
    PreferencesView,
    ReminderRunResult,
)
from app.jobs.reminders import run_reminders

router = APIRouter(prefix="/me", tags=["notifications"])
staff_router = APIRouter(prefix="/admin/jobs", tags=["admin"])


@router.get("/notification-preferences", response_model=PreferencesView)
async def get_preferences(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> PreferencesView:
    return await service.get_preferences(db, user=ctx.user)


@router.put("/notification-preferences", response_model=PreferencesView)
async def update_preferences(
    payload: PreferencesUpdate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> PreferencesView:
    return await service.update_preferences(db, user=ctx.user, payload=payload)


@router.get("/notifications", response_model=NotificationList)
async def list_notifications(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> NotificationList:
    return await service.list_in_app(db, user=ctx.user)


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.mark_all_read(db, user=ctx.user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT
)
async def mark_read(
    notification_id: uuid.UUID,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.mark_read(db, user=ctx.user, notification_id=notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@staff_router.post("/reminders", response_model=ReminderRunResult)
async def run_reminder_job(
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> ReminderRunResult:
    """Run the reminder job now (week-1 stand-in for a scheduler)."""
    if not (ctx.roles & STAFF_ROLES):
        raise PermissionDeniedError()
    deadline, session = await run_reminders(db)
    await record_event(
        db,
        action="job.reminders_run",
        actor_user_id=ctx.user.id,
        target_type="system",
        metadata={"deadline": deadline, "session": session},
    )
    await db.commit()
    return ReminderRunResult(deadline_reminders=deadline, session_reminders=session)
