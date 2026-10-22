from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    AuthRequiredError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.roles import STAFF_ROLES
from app.features.audit.service import record_event
from app.features.identity.models import User, utcnow
from app.features.opportunities import repository as repo
from app.features.opportunities.models import (
    ADULT_MIN_AGE,
    ADULT_ONLY_TYPES,
    DELIVERY_MODES,
    MATERIAL_FIELDS,
    OPPORTUNITY_TYPES,
    ListingRevision,
    Opportunity,
    WorkTerms,
)
from app.features.opportunities.schemas import (
    OpportunityCard,
    OpportunityCreate,
    OpportunityDetail,
    OpportunityListResponse,
    OpportunityUpdate,
    ProviderRef,
    WorkTermsOut,
)
from app.features.providers import repository as provider_repo
from app.features.providers import service as provider_service
from app.features.providers.models import Organization

SUBMITTABLE_STATUSES = ("draft", "changes_requested")
SORT_OPTIONS = ("relevance", "deadline", "newest")
PUBLIC_STATUSES = ("approved", "expired")

#: Listings closing within this window are labelled "closing soon".
CLOSING_SOON_DAYS = 14

#: Non-nullable work-term flags; an explicit null in an update leaves them as-is.
_REQUIRED_TERM_FLAGS = ("hazards_reviewed", "adult_only_construction")


def requires_adult(opp: Opportunity) -> bool:
    """Work listings and construction work are adults-only (spec R22a/R22b)."""
    if opp.opportunity_type in ADULT_ONLY_TYPES:
        return True
    return opp.work_terms is not None and opp.work_terms.adult_only_construction


def effective_min_age(opp: Opportunity) -> int | None:
    """The minimum age the API enforces, whatever the listing states."""
    if requires_adult(opp):
        return max(opp.min_age or 0, ADULT_MIN_AGE)
    return opp.min_age


def _enforce_adult_policy(opp: Opportunity) -> None:
    if not requires_adult(opp):
        return
    if opp.min_age is None:
        opp.min_age = ADULT_MIN_AGE
    elif opp.min_age < ADULT_MIN_AGE:
        raise ValidationError(
            f"Work and construction listings are open to adults only; "
            f"min_age must be {ADULT_MIN_AGE} or over."
        )


async def _resolve_org(
    db: AsyncSession, *, user: User, organization_id
) -> Organization:
    memberships = await provider_repo.list_memberships_for_user(db, user.id)
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
    return org


def serialize_snapshot(opp: Opportunity) -> dict:
    return {
        "opportunity_type": opp.opportunity_type,
        "title": opp.title,
        "description": opp.description,
        "eligibility": opp.eligibility,
        "cost_details": opp.cost_details,
        "pay_details": opp.pay_details,
        "location": opp.location,
        "delivery_mode": opp.delivery_mode,
        "application_route": opp.application_route,
        "external_url": opp.external_url,
        "min_age": opp.min_age,
        "deadline_at": opp.deadline_at.isoformat() if opp.deadline_at else None,
    }


def _as_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def is_expired(opp: Opportunity, *, now: datetime | None = None) -> bool:
    if opp.status == "expired":
        return True
    deadline = _as_aware(opp.deadline_at)
    if deadline is None:
        return False
    return deadline < (now or utcnow())


def is_closing_soon(opp: Opportunity, *, now: datetime | None = None) -> bool:
    if opp.status == "expired" or is_expired(opp, now=now):
        return False
    deadline = _as_aware(opp.deadline_at)
    if deadline is None:
        return False
    moment = now or utcnow()
    return timedelta(0) <= (deadline - moment) <= timedelta(days=CLOSING_SOON_DAYS)


def _provider_ref(org: Organization | None) -> ProviderRef | None:
    if org is None:
        return None
    return ProviderRef(
        id=org.id,
        name=org.name,
        verification_status=org.verification_status,
        verified_at=org.verified_at,
        public_contact=org.public_contact,
    )


def _card(
    opp: Opportunity, org: Organization | None, *, now: datetime
) -> OpportunityCard:
    return OpportunityCard(
        id=opp.id,
        organization_id=opp.organization_id,
        opportunity_type=opp.opportunity_type,
        title=opp.title,
        location=opp.location,
        delivery_mode=opp.delivery_mode,
        cost_details=opp.cost_details,
        pay_details=opp.pay_details,
        deadline_at=opp.deadline_at,
        status=opp.status,
        is_expired=is_expired(opp, now=now),
        is_closing_soon=is_closing_soon(opp, now=now),
        image_url=opp.image_url,
        is_featured=opp.is_featured,
        source_url=opp.source_url,
        updated_at=opp.updated_at,
        provider=_provider_ref(org),
    )


def _detail(
    opp: Opportunity, org: Organization | None, *, now: datetime
) -> OpportunityDetail:
    return OpportunityDetail(
        **_card(opp, org, now=now).model_dump(),
        description=opp.description,
        eligibility=opp.eligibility,
        application_route=opp.application_route,
        external_url=opp.external_url,
        min_age=opp.min_age,
        submitted_at=opp.submitted_at,
        reviewed_at=opp.reviewed_at,
        published_at=opp.published_at,
        decision_reason=opp.decision_reason,
        work_terms=(
            WorkTermsOut.model_validate(opp.work_terms) if opp.work_terms else None
        ),
    )


async def list_public_opportunities(
    db: AsyncSession,
    *,
    q: str | None = None,
    category: str | None = None,
    location: str | None = None,
    delivery_mode: str | None = None,
    sort: str = "relevance",
    page: int = 1,
    page_size: int = 12,
) -> OpportunityListResponse:
    if sort not in SORT_OPTIONS:
        raise ValidationError(f"Unknown sort. Allowed: {', '.join(SORT_OPTIONS)}")
    if category is not None and category not in OPPORTUNITY_TYPES:
        raise ValidationError(
            f"Unknown category. Allowed: {', '.join(OPPORTUNITY_TYPES)}"
        )
    if delivery_mode is not None and delivery_mode not in DELIVERY_MODES:
        raise ValidationError(
            f"Unknown delivery_mode. Allowed: {', '.join(DELIVERY_MODES)}"
        )

    rows, total = await repo.search_public(
        db,
        q=q,
        category=category,
        location=location,
        delivery_mode=delivery_mode,
        sort=sort,
        page=page,
        page_size=page_size,
    )

    now = utcnow()
    orgs: dict = {}
    items: list[OpportunityCard] = []
    for opp in rows:
        org = orgs.get(opp.organization_id)
        if org is None:
            org = await provider_repo.get_organization(db, opp.organization_id)
            orgs[opp.organization_id] = org
        items.append(_card(opp, org, now=now))

    return OpportunityListResponse(
        items=items, total=total, page=page, page_size=page_size
    )


async def get_opportunity_detail(
    db: AsyncSession,
    *,
    user: User | None,
    roles: set[str],
    opportunity_id,
) -> OpportunityDetail:
    opp = await repo.get_opportunity(db, opportunity_id)
    if opp is None:
        raise NotFoundError("Listing not found.")
    if opp.status not in PUBLIC_STATUSES:
        if user is None:
            raise AuthRequiredError()
        if not (roles & STAFF_ROLES):
            await provider_service.require_membership(
                db, user_id=user.id, organization_id=opp.organization_id
            )
    org = await provider_repo.get_organization(db, opp.organization_id)
    return _detail(opp, org, now=utcnow())


async def expire_overdue_listings(db: AsyncSession) -> int:
    now = utcnow()
    result = await db.execute(
        select(Opportunity).where(
            Opportunity.status == "approved",
            Opportunity.deadline_at.is_not(None),
            Opportunity.deadline_at < now,
        )
    )
    rows = list(result.scalars().all())
    for opp in rows:
        opp.status = "expired"
        await record_event(
            db,
            action="listing.expired",
            actor_user_id=None,
            target_type="opportunity",
            target_id=opp.id,
        )
    if rows:
        await db.commit()
    return len(rows)


async def get_opportunity_for_write(
    db: AsyncSession, *, user: User, opportunity_id
) -> Opportunity:
    opp = await repo.get_opportunity(db, opportunity_id)
    if opp is None:
        raise NotFoundError("Listing not found.")
    await provider_service.require_membership(
        db, user_id=user.id, organization_id=opp.organization_id
    )
    return opp


async def create_draft(
    db: AsyncSession, *, user: User, payload: OpportunityCreate
) -> Opportunity:
    org = await _resolve_org(db, user=user, organization_id=payload.organization_id)
    if org.verification_status != "verified":
        raise PermissionDeniedError(
            "Provider must be verified before creating listings."
        )

    data = payload.model_dump(exclude={"organization_id", "work_terms"})
    opp = Opportunity(
        organization_id=org.id,
        created_by_user_id=user.id,
        status="draft",
        **data,
    )
    opp.work_terms = (
        WorkTerms(**payload.work_terms.model_dump()) if payload.work_terms else None
    )
    _enforce_adult_policy(opp)
    db.add(opp)
    await db.flush()
    await record_event(
        db,
        action="listing.draft_created",
        actor_user_id=user.id,
        target_type="opportunity",
        target_id=opp.id,
    )
    await db.commit()
    await db.refresh(opp)
    return opp


async def update_opportunity(
    db: AsyncSession,
    *,
    user: User,
    opportunity_id,
    payload: OpportunityUpdate,
) -> Opportunity:
    opp = await get_opportunity_for_write(db, user=user, opportunity_id=opportunity_id)
    if opp.status == "suspended":
        raise ConflictError("Suspended listings cannot be edited.")

    changes = payload.model_dump(exclude_unset=True, exclude={"work_terms"})
    material_changed = False
    for field, value in changes.items():
        if field in MATERIAL_FIELDS and getattr(opp, field) != value:
            material_changed = True
        setattr(opp, field, value)

    if payload.work_terms is not None:
        terms_changes = payload.work_terms.model_dump(exclude_unset=True)
        if opp.work_terms is None:
            opp.work_terms = WorkTerms()
        for field, value in terms_changes.items():
            if value is None and field in _REQUIRED_TERM_FLAGS:
                continue
            # Construction status changes age suitability, so it is material.
            if (
                field == "adult_only_construction"
                and getattr(opp.work_terms, field) != value
            ):
                material_changed = True
            setattr(opp.work_terms, field, value)

    min_age_before = opp.min_age
    _enforce_adult_policy(opp)
    if opp.min_age != min_age_before:
        material_changed = True

    returned_to_review = False
    if opp.status == "approved" and material_changed:
        opp.status = "pending_review"
        opp.submitted_at = utcnow()
        returned_to_review = True
    elif opp.status == "rejected":
        opp.status = "draft"

    await record_event(
        db,
        action="listing.updated",
        actor_user_id=user.id,
        target_type="opportunity",
        target_id=opp.id,
        metadata={
            "material": material_changed,
            "returned_to_review": returned_to_review,
            "status": opp.status,
        },
    )
    await db.commit()
    await db.refresh(opp)
    return opp


async def submit_for_review(
    db: AsyncSession, *, user: User, opportunity_id
) -> Opportunity:
    opp = await get_opportunity_for_write(db, user=user, opportunity_id=opportunity_id)
    if opp.status not in SUBMITTABLE_STATUSES:
        raise ConflictError(
            "Only drafts or change-requested listings can be submitted."
        )

    org = await provider_repo.get_organization(db, opp.organization_id)
    if org is None or org.verification_status != "verified":
        raise PermissionDeniedError(
            "Provider must be verified before submitting listings."
        )

    opp.status = "pending_review"
    opp.submitted_at = utcnow()
    opp.decision_reason = None

    revision_number = await repo.next_revision_number(db, opp.id)
    db.add(
        ListingRevision(
            opportunity_id=opp.id,
            revision_number=revision_number,
            snapshot=serialize_snapshot(opp),
            submitted_by_user_id=user.id,
            decision="pending",
        )
    )
    await record_event(
        db,
        action="listing.submitted",
        actor_user_id=user.id,
        target_type="opportunity",
        target_id=opp.id,
        metadata={"revision": revision_number},
    )
    await db.commit()
    await db.refresh(opp)
    return opp
