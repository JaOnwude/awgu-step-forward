from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
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
    MATERIAL_FIELDS,
    ListingRevision,
    Opportunity,
)
from app.features.opportunities.schemas import OpportunityCreate, OpportunityUpdate
from app.features.providers import repository as provider_repo
from app.features.providers import service as provider_service
from app.features.providers.models import Organization

SUBMITTABLE_STATUSES = ("draft", "changes_requested")


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


async def get_opportunity_for_read(
    db: AsyncSession,
    *,
    user: User,
    roles: set[str],
    opportunity_id,
) -> Opportunity:
    opp = await repo.get_opportunity(db, opportunity_id)
    if opp is None:
        raise NotFoundError("Listing not found.")
    if opp.status == "approved":
        return opp
    if roles & STAFF_ROLES:
        return opp
    await provider_service.require_membership(
        db, user_id=user.id, organization_id=opp.organization_id
    )
    return opp


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

    data = payload.model_dump(exclude={"organization_id"})
    opp = Opportunity(
        organization_id=org.id,
        created_by_user_id=user.id,
        status="draft",
        **data,
    )
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

    changes = payload.model_dump(exclude_unset=True)
    material_changed = False
    for field, value in changes.items():
        if field in MATERIAL_FIELDS and getattr(opp, field) != value:
            material_changed = True
        setattr(opp, field, value)

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
