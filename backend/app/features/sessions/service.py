from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    AuthRequiredError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.roles import STAFF_ROLES
from app.features.applicant import repository as applicant_repo
from app.features.applicant.service import MINOR_MESSAGE
from app.features.audit.service import record_event
from app.features.identity.models import User, utcnow
from app.features.providers import repository as provider_repo
from app.features.providers.models import Organization
from app.features.sessions import repository as repo
from app.features.sessions.models import ApplicationSupportSession, SessionRegistration
from app.features.sessions.schemas import (
    MyRegistration,
    ProviderBrief,
    RegistrationOut,
    Roster,
    RosterEntry,
    SessionCreate,
    SessionListResponse,
    SessionManageOut,
    SessionOut,
)

REASON_REQUIRED = frozenset({"reject", "suspend"})


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


async def _orgs_by_id(
    db: AsyncSession, org_ids: set[uuid.UUID]
) -> dict[uuid.UUID, Organization]:
    orgs: dict[uuid.UUID, Organization] = {}
    for org_id in org_ids:
        org = await provider_repo.get_organization(db, org_id)
        if org is not None:
            orgs[org_id] = org
    return orgs


def _public(
    session: ApplicationSupportSession, org: Organization | None, registered: int
) -> SessionOut:
    seats_left = max(session.capacity - registered, 0)
    return SessionOut(
        id=session.id,
        organization_id=session.organization_id,
        provider=(
            ProviderBrief(
                id=org.id, name=org.name, verification_status=org.verification_status
            )
            if org
            else None
        ),
        topic=session.topic,
        description=session.description,
        starts_at=session.starts_at,
        ends_at=session.ends_at,
        delivery_mode=session.delivery_mode,
        location=session.location,
        capacity=session.capacity,
        seats_left=seats_left,
        is_full=seats_left == 0,
        has_started=_as_aware(session.starts_at) <= utcnow(),
        accessibility_notes=session.accessibility_notes,
        age_suitability=session.age_suitability,
        organizer_contact=session.organizer_contact,
        status=session.status,
    )


def _manage(
    session: ApplicationSupportSession, org: Organization | None, registered: int
) -> SessionManageOut:
    return SessionManageOut(
        **_public(session, org, registered).model_dump(),
        registered_count=registered,
        decision_reason=session.decision_reason,
        submitted_at=session.submitted_at,
        reviewed_at=session.reviewed_at,
    )


async def _serialize_many(
    db: AsyncSession, sessions: list[ApplicationSupportSession], *, manage: bool
) -> list:
    counts = await repo.registered_counts(db, [s.id for s in sessions])
    orgs = await _orgs_by_id(db, {s.organization_id for s in sessions})
    build = _manage if manage else _public
    return [
        build(s, orgs.get(s.organization_id), counts.get(s.id, 0)) for s in sessions
    ]


async def _is_member_or_staff(
    db: AsyncSession, *, user: User, roles: set[str], organization_id: uuid.UUID
) -> bool:
    if roles & STAFF_ROLES:
        return True
    membership = await provider_repo.get_membership(
        db, organization_id=organization_id, user_id=user.id
    )
    return membership is not None


async def _require_organizer(
    db: AsyncSession, *, user: User, roles: set[str], session_id: uuid.UUID
) -> ApplicationSupportSession:
    session = await repo.get_session(db, session_id)
    if session is None or not await _is_member_or_staff(
        db, user=user, roles=roles, organization_id=session.organization_id
    ):
        # Same answer whether the session is missing or belongs to another
        # organization, so IDs cannot be probed.
        raise NotFoundError("Session not found.")
    return session


# --- Organizer -------------------------------------------------------------


async def propose_session(
    db: AsyncSession, *, user: User, payload: SessionCreate
) -> SessionManageOut:
    memberships = await provider_repo.list_memberships_for_user(db, user.id)
    organization_id = payload.organization_id
    if organization_id is None:
        if len(memberships) != 1:
            raise ValidationError(
                "organization_id is required when you belong to multiple providers."
            )
        organization_id = memberships[0].organization_id
    elif not any(m.organization_id == organization_id for m in memberships):
        raise NotFoundError("Provider not found.")

    org = await provider_repo.get_organization(db, organization_id)
    if org is None:
        raise NotFoundError("Provider not found.")
    if org.verification_status != "verified":
        raise PermissionDeniedError(
            "Only verified providers can propose support sessions."
        )

    starts_at = _as_aware(payload.starts_at)
    if starts_at <= utcnow():
        raise ValidationError("Sessions must start in the future.")

    session = ApplicationSupportSession(
        organization_id=org.id,
        created_by_user_id=user.id,
        **payload.model_dump(exclude={"organization_id"}),
        status="pending_review",
        submitted_at=utcnow(),
    )
    db.add(session)
    await db.flush()
    await record_event(
        db,
        action="session.submitted",
        actor_user_id=user.id,
        target_type="support_session",
        target_id=session.id,
    )
    await db.commit()
    await db.refresh(session)
    return _manage(session, org, 0)


async def list_managed_sessions(
    db: AsyncSession, *, user: User
) -> list[SessionManageOut]:
    memberships = await provider_repo.list_memberships_for_user(db, user.id)
    sessions = await repo.list_for_organizations(
        db, [m.organization_id for m in memberships]
    )
    return await _serialize_many(db, sessions, manage=True)


async def get_roster(
    db: AsyncSession, *, user: User, roles: set[str], session_id: uuid.UUID
) -> Roster:
    session = await _require_organizer(
        db, user=user, roles=roles, session_id=session_id
    )
    registrations = await repo.list_registrations_for_session(db, session.id)
    names = await applicant_repo.preferred_names(db, [r.user_id for r in registrations])
    org = await provider_repo.get_organization(db, session.organization_id)
    registered = sum(1 for r in registrations if r.status == "registered")

    # Viewing registrant data is privileged access (spec R44).
    await record_event(
        db,
        action="session.roster_viewed",
        actor_user_id=user.id,
        target_type="support_session",
        target_id=session.id,
    )
    await db.commit()

    return Roster(
        session=_manage(session, org, registered),
        entries=[
            RosterEntry(
                registration_id=r.id,
                preferred_name=names.get(r.user_id, "Applicant"),
                status=r.status,
                attendance=r.attendance,
                registered_at=r.registered_at,
            )
            for r in registrations
        ],
    )


async def record_attendance(
    db: AsyncSession,
    *,
    user: User,
    roles: set[str],
    session_id: uuid.UUID,
    registration_id: uuid.UUID,
    attendance: str,
) -> RegistrationOut:
    session = await _require_organizer(
        db, user=user, roles=roles, session_id=session_id
    )
    registration = await repo.get_registration_by_id(db, registration_id)
    if registration is None or registration.session_id != session.id:
        raise NotFoundError("Registration not found.")
    if registration.status != "registered":
        raise ConflictError("Attendance can only be recorded for active registrations.")

    registration.attendance = attendance
    await record_event(
        db,
        action="session.attendance_recorded",
        actor_user_id=user.id,
        target_type="session_registration",
        target_id=registration.id,
        metadata={"attendance": attendance},
    )
    await db.commit()
    await db.refresh(registration)
    return RegistrationOut.model_validate(registration)


# --- Public ----------------------------------------------------------------


async def list_public_sessions(
    db: AsyncSession, *, page: int, page_size: int
) -> SessionListResponse:
    rows, total = await repo.list_public(
        db, now=utcnow(), page=page, page_size=page_size
    )
    items = await _serialize_many(db, rows, manage=False)
    return SessionListResponse(items=items, total=total, page=page, page_size=page_size)


async def get_session_detail(
    db: AsyncSession, *, user: User | None, roles: set[str], session_id: uuid.UUID
) -> SessionOut:
    session = await repo.get_session(db, session_id)
    if session is None:
        raise NotFoundError("Session not found.")
    if session.status != "approved":
        if user is None:
            raise AuthRequiredError()
        if not await _is_member_or_staff(
            db, user=user, roles=roles, organization_id=session.organization_id
        ):
            raise NotFoundError("Session not found.")
    (item,) = await _serialize_many(db, [session], manage=False)
    return item


# --- Applicant -------------------------------------------------------------


async def register(
    db: AsyncSession, *, user: User, session_id: uuid.UUID, reminder_opt_in: bool
) -> RegistrationOut:
    profile = await applicant_repo.get_profile(db, user.id)
    if profile is None:
        raise PermissionDeniedError("Create your applicant profile before registering.")
    if profile.is_minor:
        raise PermissionDeniedError(MINOR_MESSAGE)

    session = await repo.get_session(db, session_id, for_update=True)
    if session is None or session.status != "approved":
        raise NotFoundError("Session not found.")
    if _as_aware(session.starts_at) <= utcnow():
        raise ConflictError("Registration has closed for this session.")

    existing = await repo.get_registration(db, session_id=session.id, user_id=user.id)
    if existing is not None and existing.status == "registered":
        # Repeated taps or retries return the same registration.
        return RegistrationOut.model_validate(existing)

    counts = await repo.registered_counts(db, [session.id])
    if counts.get(session.id, 0) >= session.capacity:
        raise ConflictError("This session is full.")

    now = utcnow()
    if existing is None:
        registration = SessionRegistration(
            session_id=session.id,
            user_id=user.id,
            status="registered",
            reminder_opt_in=reminder_opt_in,
            registered_at=now,
        )
        db.add(registration)
    else:
        registration = existing
        registration.status = "registered"
        registration.attendance = "unknown"
        registration.reminder_opt_in = reminder_opt_in
        registration.registered_at = now
        registration.cancelled_at = None
    await db.flush()
    await record_event(
        db,
        action="session.registered",
        actor_user_id=user.id,
        target_type="session_registration",
        target_id=registration.id,
    )
    await db.commit()
    await db.refresh(registration)
    return RegistrationOut.model_validate(registration)


async def cancel_registration(
    db: AsyncSession, *, user: User, session_id: uuid.UUID
) -> RegistrationOut:
    registration = await repo.get_registration(
        db, session_id=session_id, user_id=user.id
    )
    if registration is None:
        raise NotFoundError("Registration not found.")
    if registration.status == "cancelled":
        return RegistrationOut.model_validate(registration)
    session = await repo.get_session(db, session_id)
    if session is not None and _as_aware(session.starts_at) <= utcnow():
        raise ConflictError("This session has already started.")

    registration.status = "cancelled"
    registration.cancelled_at = utcnow()
    await record_event(
        db,
        action="session.registration_cancelled",
        actor_user_id=user.id,
        target_type="session_registration",
        target_id=registration.id,
    )
    await db.commit()
    await db.refresh(registration)
    return RegistrationOut.model_validate(registration)


async def list_my_registrations(
    db: AsyncSession, *, user: User
) -> list[MyRegistration]:
    registrations = await repo.list_registrations_for_user(db, user.id)
    sessions = []
    for registration in registrations:
        session = await repo.get_session(db, registration.session_id)
        if session is not None:
            sessions.append(session)
    serialized = {
        item.id: item for item in await _serialize_many(db, sessions, manage=False)
    }
    return [
        MyRegistration(
            **RegistrationOut.model_validate(r).model_dump(),
            session=serialized[r.session_id],
        )
        for r in registrations
        if r.session_id in serialized
    ]


# --- Staff -----------------------------------------------------------------


async def pending_sessions(db: AsyncSession) -> list[SessionManageOut]:
    sessions = await repo.list_by_status(db, "pending_review")
    return await _serialize_many(db, sessions, manage=True)


async def decide_session(
    db: AsyncSession,
    *,
    admin: User,
    session_id: uuid.UUID,
    decision: str,
    reason: str | None,
) -> SessionManageOut:
    session = await repo.get_session(db, session_id)
    if session is None:
        raise NotFoundError("Session not found.")
    if decision in REASON_REQUIRED and not (reason and reason.strip()):
        raise ValidationError("A reason is required for this decision.")

    org = await provider_repo.get_organization(db, session.organization_id)
    if decision == "approve":
        if org is None or org.verification_status != "verified":
            raise ConflictError("Cannot approve a session from an unverified provider.")
        session.status = "approved"
        session.decision_reason = None
    elif decision == "reject":
        session.status = "rejected"
        session.decision_reason = reason
    else:
        session.status = "suspended"
        session.decision_reason = reason

    session.reviewed_at = utcnow()
    session.reviewed_by_user_id = admin.id
    await record_event(
        db,
        action=f"session.{session.status}",
        actor_user_id=admin.id,
        target_type="support_session",
        target_id=session.id,
        metadata={"decision": decision},
    )
    await db.commit()
    await db.refresh(session)
    counts = await repo.registered_counts(db, [session.id])
    return _manage(session, org, counts.get(session.id, 0))
