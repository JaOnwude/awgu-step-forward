from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    AuthContext,
    get_current_context,
    get_optional_context,
    verify_csrf,
)
from app.db.session import get_db
from app.features.sessions import service
from app.features.sessions.schemas import (
    AttendanceUpdate,
    MyRegistration,
    RegistrationCreate,
    RegistrationOut,
    Roster,
    SessionCreate,
    SessionListResponse,
    SessionManageOut,
    SessionOut,
)

router = APIRouter(
    prefix="/application-support-sessions", tags=["application-support-sessions"]
)
me_router = APIRouter(prefix="/me", tags=["applicant"])


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    return await service.list_public_sessions(db, page=page, page_size=page_size)


@router.post("", response_model=SessionManageOut, status_code=201)
async def propose_session(
    payload: SessionCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> SessionManageOut:
    return await service.propose_session(db, user=ctx.user, payload=payload)


# Declared before "/{session_id}" so "manage" is not parsed as an ID.
@router.get("/manage", response_model=list[SessionManageOut])
async def list_managed_sessions(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> list[SessionManageOut]:
    return await service.list_managed_sessions(db, user=ctx.user)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    ctx: AuthContext | None = Depends(get_optional_context),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    return await service.get_session_detail(
        db,
        user=ctx.user if ctx else None,
        roles=ctx.roles if ctx else set(),
        session_id=session_id,
    )


@router.post(
    "/{session_id}/registrations", response_model=RegistrationOut, status_code=201
)
async def register(
    session_id: uuid.UUID,
    payload: RegistrationCreate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> RegistrationOut:
    return await service.register(
        db,
        user=ctx.user,
        session_id=session_id,
        reminder_opt_in=payload.reminder_opt_in,
    )


@router.post("/{session_id}/registrations/cancel", response_model=RegistrationOut)
async def cancel_registration(
    session_id: uuid.UUID,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> RegistrationOut:
    return await service.cancel_registration(db, user=ctx.user, session_id=session_id)


@router.get("/{session_id}/roster", response_model=Roster)
async def get_roster(
    session_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> Roster:
    return await service.get_roster(
        db, user=ctx.user, roles=ctx.roles, session_id=session_id
    )


@router.patch(
    "/{session_id}/registrations/{registration_id}", response_model=RegistrationOut
)
async def record_attendance(
    session_id: uuid.UUID,
    registration_id: uuid.UUID,
    payload: AttendanceUpdate,
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> RegistrationOut:
    return await service.record_attendance(
        db,
        user=ctx.user,
        roles=ctx.roles,
        session_id=session_id,
        registration_id=registration_id,
        attendance=payload.attendance,
    )


@me_router.get("/session-registrations", response_model=list[MyRegistration])
async def list_my_registrations(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> list[MyRegistration]:
    return await service.list_my_registrations(db, user=ctx.user)
