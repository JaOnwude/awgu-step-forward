from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.features.audit.service import record_event
from app.features.identity.models import User, utcnow
from app.features.opportunities import repository as opportunity_repo
from app.features.opportunities.models import Opportunity
from app.features.providers import repository as provider_repo

REASON_REQUIRED = frozenset({"reject", "request_changes", "suspend", "restore"})

# Which listing statuses each staff decision may start from (spec R20).
# approve/reject/request_changes/suspend keep their week-1 behaviour.
ALLOWED_FROM = {
    "restore": frozenset({"suspended"}),
    "expire": frozenset({"approved"}),
}


async def moderation_queue(
    db: AsyncSession,
) -> tuple[list, list[Opportunity]]:
    providers = await provider_repo.list_pending_organizations(db)
    listings = await opportunity_repo.list_by_status(db, "pending_review")
    return providers, listings


async def live_catalog(db: AsyncSession) -> dict:
    """Published and suspended items staff can suspend, expire or restore."""
    return {
        "live_listings": await opportunity_repo.list_by_status(db, "approved"),
        "suspended_listings": await opportunity_repo.list_by_status(db, "suspended"),
        "verified_providers": await provider_repo.list_organizations_by_status(
            db, "verified"
        ),
        "suspended_providers": await provider_repo.list_organizations_by_status(
            db, "suspended"
        ),
    }


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
    allowed = ALLOWED_FROM.get(decision)
    if allowed is not None and opp.status not in allowed:
        state = opp.status.replace("_", " ")
        raise ConflictError(f"A {state} listing cannot be {decision}d.")

    now = utcnow()
    if decision in ("approve", "restore"):
        org = await provider_repo.get_organization(db, opp.organization_id)
        if org is None or org.verification_status != "verified":
            raise ConflictError(
                f"Cannot {decision} a listing from an unverified provider."
            )
        opp.status = "approved"
        opp.published_at = opp.published_at if decision == "restore" else now
        opp.decision_reason = None if decision == "approve" else reason
    elif decision == "reject":
        opp.status = "rejected"
        opp.decision_reason = reason
    elif decision == "request_changes":
        opp.status = "changes_requested"
        opp.decision_reason = reason
    elif decision == "expire":
        # Closed early by staff; kept visible as "closed" like a passed deadline.
        opp.status = "expired"
        opp.decision_reason = reason
    else:  # suspend
        opp.status = "suspended"
        opp.decision_reason = reason

    opp.reviewed_at = now
    opp.reviewed_by_user_id = admin.id

    revision = await opportunity_repo.latest_pending_revision(db, opp.id)
    if revision is not None and decision not in ALLOWED_FROM:
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
