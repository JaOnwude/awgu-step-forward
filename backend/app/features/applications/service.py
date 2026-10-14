from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.features.applicant import repository as applicant_repo
from app.features.applicant.service import MINOR_MESSAGE, age_years
from app.features.applications import repository as repo
from app.features.applications.form import (
    FORM_QUESTIONS,
    FORM_VERSION,
    KNOWN_KEYS,
    REQUIRED_KEYS,
)
from app.features.applications.models import (
    EDITABLE_STATUSES,
    TRACKED_ROUTES,
    WITHDRAWABLE_STATUSES,
    Application,
    ApplicationAnswer,
    ApplicationStatusEvent,
)
from app.features.applications.schemas import (
    ApplicationAnswerView,
    ApplicationDetail,
    ApplicationFormView,
    ApplicationReceipt,
    ApplicationStatusEventView,
    ApplicationSummary,
    ApplicationUpdate,
    FormQuestion,
    TrackingUpdate,
)
from app.features.audit.service import record_event
from app.features.identity.models import User
from app.features.opportunities import repository as opp_repo
from app.features.opportunities.service import effective_min_age, is_expired

SHARED_PROFILE_FIELDS = (
    "preferred_name",
    "age_band",
    "lga",
    "community",
    "education_level",
    "interests",
    "skills",
    "experience",
)


def reference_for(application: Application) -> str:
    return f"ASF-{str(application.id).split('-')[0].upper()}"


def _require_platform(application: Application) -> None:
    if application.route != "platform":
        raise ConflictError(
            "This application was made outside StepForward. Update its status instead."
        )


def form_view(opportunity_id: uuid.UUID) -> ApplicationFormView:
    return ApplicationFormView(
        opportunity_id=opportunity_id,
        form_version=FORM_VERSION,
        questions=[FormQuestion(**question) for question in FORM_QUESTIONS],
    )


def _summary(application: Application, opportunity_title: str) -> ApplicationSummary:
    return ApplicationSummary(
        id=application.id,
        reference=reference_for(application),
        opportunity_id=application.opportunity_id,
        opportunity_title=opportunity_title,
        route=application.route,
        status=application.status,
        status_source=application.status_source,
        submitted_at=application.submitted_at,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


async def _require_own(
    db: AsyncSession, *, user: User, application_id: uuid.UUID
) -> Application:
    application = await repo.get_application(db, application_id)
    if application is None or application.applicant_user_id != user.id:
        raise NotFoundError("Application not found.")
    return application


async def _detail(db: AsyncSession, application: Application) -> ApplicationDetail:
    opp = await opp_repo.get_opportunity(db, application.opportunity_id)
    title = opp.title if opp is not None else "Listing unavailable"
    answers = await repo.list_answers(db, application.id)
    events = await repo.list_events(db, application.id)
    base = _summary(application, title)
    return ApplicationDetail(
        **base.model_dump(),
        form_version=application.form_version,
        private_note=application.private_note,
        answers=[
            ApplicationAnswerView(
                question_key=a.question_key, answer_value=a.answer_value
            )
            for a in answers
        ],
        history=[
            ApplicationStatusEventView(
                from_status=e.from_status,
                to_status=e.to_status,
                source=e.source,
                note=e.note,
                created_at=e.created_at,
            )
            for e in events
        ],
    )


async def create_or_get_draft(
    db: AsyncSession, *, user: User, opportunity_id: uuid.UUID
) -> ApplicationDetail:
    profile = await applicant_repo.get_profile(db, user.id)
    if profile is None:
        raise PermissionDeniedError(
            "Create your applicant profile before applying."
        )
    if profile.is_minor:
        raise PermissionDeniedError(MINOR_MESSAGE)

    opp = await opp_repo.get_opportunity(db, opportunity_id)
    if opp is None or opp.status != "approved":
        raise NotFoundError("Listing not found.")
    if is_expired(opp):
        raise ConflictError("This listing has closed and is no longer accepting.")
    if opp.application_route != "platform":
        raise ValidationError("This listing does not use in-platform applications.")
    min_age = effective_min_age(opp)
    if min_age is not None and age_years(profile.date_of_birth) < min_age:
        raise PermissionDeniedError(
            f"This opportunity is open to applicants aged {min_age} and over."
        )

    existing = await repo.get_by_applicant_listing(
        db, applicant_user_id=user.id, opportunity_id=opportunity_id
    )
    if existing is not None:
        return await _detail(db, existing)

    application = Application(
        applicant_user_id=user.id,
        opportunity_id=opportunity_id,
        route="platform",
        status="draft",
        status_source="applicant",
        form_version=FORM_VERSION,
    )
    db.add(application)
    await db.flush()
    db.add(
        ApplicationStatusEvent(
            application_id=application.id,
            from_status=None,
            to_status="draft",
            source="applicant",
            actor_user_id=user.id,
        )
    )
    await record_event(
        db,
        action="application.draft_created",
        actor_user_id=user.id,
        target_type="application",
        target_id=application.id,
    )
    await db.commit()
    await db.refresh(application)
    return await _detail(db, application)


async def update_answers(
    db: AsyncSession,
    *,
    user: User,
    application_id: uuid.UUID,
    payload: ApplicationUpdate,
) -> ApplicationDetail:
    application = await _require_own(db, user=user, application_id=application_id)
    _require_platform(application)
    if application.status not in EDITABLE_STATUSES:
        raise ConflictError("Only draft applications can be edited.")

    for item in payload.answers:
        if item.question_key not in KNOWN_KEYS:
            raise ValidationError(f"Unknown question: {item.question_key}")
        answer = await repo.get_answer(
            db, application_id=application.id, question_key=item.question_key
        )
        if answer is None:
            answer = ApplicationAnswer(
                application_id=application.id, question_key=item.question_key
            )
            db.add(answer)
        answer.answer_value = item.answer_value

    await db.commit()
    await db.refresh(application)
    return await _detail(db, application)


async def submit(
    db: AsyncSession,
    *,
    user: User,
    application_id: uuid.UUID,
    idempotency_key: str | None,
) -> ApplicationReceipt:
    application = await _require_own(db, user=user, application_id=application_id)
    _require_platform(application)

    if application.status != "draft":
        if idempotency_key and application.idempotency_key == idempotency_key:
            return _receipt(application, "Already submitted.")
        raise ConflictError("This application has already been submitted.")

    answers = await repo.list_answers(db, application.id)
    provided = {
        a.question_key: (a.answer_value or "").strip() for a in answers
    }
    missing = [key for key in REQUIRED_KEYS if not provided.get(key)]
    if missing:
        raise ValidationError(
            f"Please answer all required questions: {', '.join(missing)}"
        )

    now = datetime.now(UTC)
    application.status = "submitted"
    application.status_source = "applicant"
    application.submitted_at = now
    application.idempotency_key = idempotency_key
    application.consent_snapshot = {
        "shared_profile_fields": list(SHARED_PROFILE_FIELDS),
        "responses": sorted(provided.keys()),
        "form_version": application.form_version,
        "accepted_at": now.isoformat(),
    }
    db.add(
        ApplicationStatusEvent(
            application_id=application.id,
            from_status="draft",
            to_status="submitted",
            source="applicant",
            actor_user_id=user.id,
        )
    )
    await record_event(
        db,
        action="application.submitted",
        actor_user_id=user.id,
        target_type="application",
        target_id=application.id,
    )
    await db.commit()
    await db.refresh(application)
    return _receipt(application, "Application submitted.")


def _receipt(application: Application, message: str) -> ApplicationReceipt:
    return ApplicationReceipt(
        id=application.id,
        reference=reference_for(application),
        status=application.status,
        submitted_at=application.submitted_at,
        message=message,
    )


async def withdraw(
    db: AsyncSession,
    *,
    user: User,
    application_id: uuid.UUID,
    note: str | None,
) -> ApplicationDetail:
    application = await _require_own(db, user=user, application_id=application_id)
    _require_platform(application)
    if application.status not in WITHDRAWABLE_STATUSES:
        raise ConflictError("This application cannot be withdrawn.")

    previous = application.status
    application.status = "withdrawn"
    application.status_source = "applicant"
    db.add(
        ApplicationStatusEvent(
            application_id=application.id,
            from_status=previous,
            to_status="withdrawn",
            source="applicant",
            note=note,
            actor_user_id=user.id,
        )
    )
    await record_event(
        db,
        action="application.withdrawn",
        actor_user_id=user.id,
        target_type="application",
        target_id=application.id,
    )
    await db.commit()
    await db.refresh(application)
    return await _detail(db, application)


async def list_for_applicant(
    db: AsyncSession, *, user: User
) -> list[ApplicationSummary]:
    applications = await repo.list_by_applicant(db, user.id)
    summaries: list[ApplicationSummary] = []
    for application in applications:
        opp = await opp_repo.get_opportunity(db, application.opportunity_id)
        title = opp.title if opp is not None else "Listing unavailable"
        summaries.append(_summary(application, title))
    return summaries


async def get_detail(
    db: AsyncSession, *, user: User, application_id: uuid.UUID
) -> ApplicationDetail:
    application = await _require_own(db, user=user, application_id=application_id)
    return await _detail(db, application)


# --- Applications made elsewhere (spec journey 5, R28) ----------------------


async def start_tracking(
    db: AsyncSession, *, user: User, opportunity_id: uuid.UUID
) -> ApplicationDetail:
    """Record that the applicant chose to apply on the provider's site or in
    person. Only called after the applicant's own action, and the status is
    always applicant-reported."""
    profile = await applicant_repo.get_profile(db, user.id)
    if profile is None:
        raise PermissionDeniedError(
            "Create your applicant profile to track applications."
        )
    if profile.is_minor:
        raise PermissionDeniedError(MINOR_MESSAGE)

    opp = await opp_repo.get_opportunity(db, opportunity_id)
    if opp is None or opp.status != "approved":
        raise NotFoundError("Listing not found.")
    if opp.application_route not in TRACKED_ROUTES:
        raise ValidationError("This listing uses in-platform applications.")
    min_age = effective_min_age(opp)
    if min_age is not None and age_years(profile.date_of_birth) < min_age:
        raise PermissionDeniedError(
            f"This opportunity is open to applicants aged {min_age} and over."
        )

    existing = await repo.get_by_applicant_listing(
        db, applicant_user_id=user.id, opportunity_id=opportunity_id
    )
    if existing is not None:
        return await _detail(db, existing)

    application = Application(
        applicant_user_id=user.id,
        opportunity_id=opportunity_id,
        route=opp.application_route,
        status="started",
        status_source="applicant",
        form_version="none",
    )
    db.add(application)
    await db.flush()
    db.add(
        ApplicationStatusEvent(
            application_id=application.id,
            from_status=None,
            to_status="started",
            source="applicant",
            actor_user_id=user.id,
        )
    )
    await record_event(
        db,
        action="application.tracking_started",
        actor_user_id=user.id,
        target_type="application",
        target_id=application.id,
        metadata={"route": application.route},
    )
    await db.commit()
    await db.refresh(application)
    return await _detail(db, application)


async def update_tracking(
    db: AsyncSession,
    *,
    user: User,
    application_id: uuid.UUID,
    payload: TrackingUpdate,
) -> ApplicationDetail:
    application = await _require_own(db, user=user, application_id=application_id)
    if application.route not in TRACKED_ROUTES:
        raise ConflictError("In-platform applications are updated by the provider.")

    if payload.private_note is not None:
        application.private_note = payload.private_note.strip() or None

    if payload.status != application.status:
        previous = application.status
        application.status = payload.status
        application.status_source = "applicant"
        if payload.status == "submitted" and application.submitted_at is None:
            application.submitted_at = datetime.now(UTC)
        db.add(
            ApplicationStatusEvent(
                application_id=application.id,
                from_status=previous,
                to_status=payload.status,
                source="applicant",
                actor_user_id=user.id,
            )
        )
        await record_event(
            db,
            action="application.tracking_updated",
            actor_user_id=user.id,
            target_type="application",
            target_id=application.id,
            metadata={"status": payload.status},
        )
    await db.commit()
    await db.refresh(application)
    return await _detail(db, application)
