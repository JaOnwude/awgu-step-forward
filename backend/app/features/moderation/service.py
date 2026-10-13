from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.features.audit.service import record_event
from app.features.identity.models import User, utcnow
from app.features.opportunities import repository as opportunity_repo
from app.features.opportunities.models import Opportunity
from app.features.providers import repository as provider_repo

REASON_REQUIRED = frozenset({"reject", "request_changes", "suspend"})


async def moderation_queue(
    db: AsyncSession,
) -> tuple[list, list[Opportunity]]:
    providers = await provider_repo.list_pending_organizations(db)
    listings = await opportunity_repo.list_by_status(db, "pending_review")
    return providers, listings


async def decide_listing(
    db: AsyncSession,
    *,
    admin: User,
    opportunity_id,
    decision: str,
    reason: str | None,
) -> Opportunity:
    opp = await opportunity_repo.get_opportunity(db, opportunity_id)
    if opp is None:
        raise NotFoundError("Listing not found.")
    if decision in REASON_REQUIRED and not (reason and reason.strip()):
        raise ValidationError("A reason is required for this decision.")

    now = utcnow()
    if decision == "approve":
        org = await provider_repo.get_organization(db, opp.organization_id)
        if org is None or org.verification_status != "verified":
            raise ConflictError(
                "Cannot approve a listing from an unverified provider."
            )
        opp.status = "approved"
        opp.published_at = now
        opp.decision_reason = None
    elif decision == "reject":
        opp.status = "rejected"
        opp.decision_reason = reason
    elif decision == "request_changes":
        opp.status = "changes_requested"
        opp.decision_reason = reason
    else:  # suspend
        opp.status = "suspended"
        opp.decision_reason = reason

    opp.reviewed_at = now
    opp.reviewed_by_user_id = admin.id

    revision = await opportunity_repo.latest_pending_revision(db, opp.id)
    if revision is not None:
        revision.decision = decision
        revision.decision_reason = reason
        revision.reviewer_user_id = admin.id
        revision.reviewed_at = now

    await record_event(
        db,
        action=f"listing.{decision}",
        actor_user_id=admin.id,
        target_type="opportunity",
        target_id=opp.id,
        metadata={"decision": decision},
    )
    await db.commit()
    await db.refresh(opp)
    return opp
