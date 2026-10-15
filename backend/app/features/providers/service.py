from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.core.roles import PROVIDER_ROLE
from app.features.audit.service import record_event
from app.features.identity import repository as identity_repo
from app.features.identity.models import User, utcnow
from app.features.opportunities.models import Opportunity
from app.features.providers import repository as repo
from app.features.providers.models import (
    Organization,
    ProviderMembership,
    VerificationCase,
)
from app.features.providers.schemas import (
    MemberView,
    ProviderDetail,
    ProviderRequestCreate,
    ProviderView,
)
from app.features.sessions.models import ApplicationSupportSession


def serialize_provider(org: Organization) -> ProviderView:
    return ProviderView(
        id=org.id,
        name=org.name,
        provider_type=org.provider_type,
        operating_area=org.operating_area,
        verification_status=org.verification_status,
        verified_at=org.verified_at,
        created_at=org.created_at,
    )


async def request_provider_access(
    db: AsyncSession, *, user: User, payload: ProviderRequestCreate
) -> Organization:
    org = Organization(
        name=payload.name.strip(),
        provider_type=payload.provider_type,
        public_contact=payload.public_contact.strip(),
        operating_area=payload.operating_area.strip(),
        verification_status="pending",
    )
    db.add(org)
    await db.flush()

    db.add(
        ProviderMembership(
            organization_id=org.id,
            user_id=user.id,
            role="owner",
            status="active",
        )
    )
    db.add(
        VerificationCase(
            organization_id=org.id,
            evidence_type=payload.evidence_type,
            evidence_reference=payload.evidence_reference,
            status="pending",
        )
    )
    await identity_repo.ensure_role(db, user.id, PROVIDER_ROLE)
    await record_event(
        db,
        action="provider.requested",
        actor_user_id=user.id,
        target_type="organization",
        target_id=org.id,
    )
    await db.commit()
    await db.refresh(org)
    return org


async def require_membership(
    db: AsyncSession, *, user_id: uuid.UUID, organization_id: uuid.UUID
) -> ProviderMembership:
    membership = await repo.get_membership(
        db, organization_id=organization_id, user_id=user_id
    )
    if membership is None:
        raise NotFoundError("Provider not found.")
    return membership


async def get_provider_detail(db: AsyncSession, *, org: Organization) -> ProviderDetail:
    members = await repo.list_members(db, org.id)
    return ProviderDetail(
        id=org.id,
        name=org.name,
        provider_type=org.provider_type,
        operating_area=org.operating_area,
        verification_status=org.verification_status,
        verified_at=org.verified_at,
        created_at=org.created_at,
        public_contact=org.public_contact,
        recheck_at=org.recheck_at,
        members=[MemberView.model_validate(m) for m in members],
    )


async def _suspend_published_items(
    db: AsyncSession, *, org: Organization, admin: User, rationale: str
) -> None:
    """Take a suspended provider's live listings and sessions offline.

    Each one is suspended and audited individually, so the ordinary public
    rules hide it everywhere (directory, detail, apply, register, reports).
    """
    reason = f"Provider suspended: {rationale}"
    now = utcnow()
    listings = await db.scalars(
        select(Opportunity).where(
            Opportunity.organization_id == org.id, Opportunity.status == "approved"
        )
    )
    for opp in listings:
        opp.status = "suspended"
        opp.decision_reason = reason
        opp.reviewed_at = now
        opp.reviewed_by_user_id = admin.id
        await record_event(
            db,
            action="listing.suspend",
            actor_user_id=admin.id,
            target_type="opportunity",
            target_id=opp.id,
            metadata={"decision": "suspend", "cause": "provider_suspended"},
        )
    sessions = await db.scalars(
        select(ApplicationSupportSession).where(
            ApplicationSupportSession.organization_id == org.id,
            ApplicationSupportSession.status == "approved",
        )
    )
    for session in sessions:
        session.status = "suspended"
        session.decision_reason = reason
        session.reviewed_at = now
        session.reviewed_by_user_id = admin.id
        await record_event(
            db,
            action="session.suspended",
            actor_user_id=admin.id,
            target_type="support_session",
            target_id=session.id,
            metadata={"decision": "suspend", "cause": "provider_suspended"},
        )


async def decide_verification(
    db: AsyncSession,
    *,
    admin: User,
    organization_id: uuid.UUID,
    decision: str,
    rationale: str,
    recheck_days: int | None,
) -> Organization:
    org = await repo.get_organization(db, organization_id)
    if org is None:
        raise NotFoundError("Provider not found.")

    now = utcnow()
    if decision == "suspend":
        if org.verification_status != "verified":
            raise ConflictError("Only a verified provider can be suspended.")
        org.verification_status = "suspended"
        await _suspend_published_items(db, org=org, admin=admin, rationale=rationale)
    elif decision == "restore":
        if org.verification_status != "suspended":
            raise ConflictError("Only a suspended provider can be restored.")
        # Its listings and sessions stay suspended; staff restore each one.
        org.verification_status = "verified"
    else:
        approved = decision == "approve"
        org.verification_status = "verified" if approved else "rejected"
        org.verified_at = now if approved else None
        org.recheck_at = (
            now + timedelta(days=recheck_days)
            if approved and recheck_days is not None
            else None
        )

    db.add(
        VerificationCase(
            organization_id=org.id,
            status=org.verification_status,
            decision=decision,
            rationale=rationale,
            reviewer_user_id=admin.id,
            reviewed_at=now,
            recheck_at=org.recheck_at,
        )
    )
    await record_event(
        db,
        action=(
            "provider.restored"
            if decision == "restore"
            else f"provider.{org.verification_status}"
        ),
        actor_user_id=admin.id,
        target_type="organization",
        target_id=org.id,
        metadata={"decision": decision},
    )
    await db.commit()
    await db.refresh(org)
    return org
