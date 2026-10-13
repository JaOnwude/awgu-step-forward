from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, PermissionDeniedError
from app.features.applicant import repository as repo
from app.features.applicant.models import ApplicantProfile, SavedOpportunity
from app.features.applicant.schemas import (
    ApplicantProfileUpdate,
    SavedListingView,
)
from app.features.audit.service import record_event
from app.features.identity.models import User
from app.features.opportunities import repository as opp_repo
from app.features.opportunities.service import PUBLIC_STATUSES, is_expired

MINOR_MESSAGE = (
    "Accounts for people under 18 are not available in this pilot. "
    "A guardian-linked flow must be completed first."
)


def _saved_view(saved: SavedOpportunity, opp) -> SavedListingView:
    return SavedListingView(
        id=saved.id,
        opportunity_id=opp.id,
        title=opp.title,
        location=opp.location,
        opportunity_type=opp.opportunity_type,
        is_expired=is_expired(opp),
        saved_at=saved.created_at,
    )


def age_years(dob: date, *, today: date | None = None) -> int:
    today = today or date.today()
    return (
        today.year
        - dob.year
        - ((today.month, today.day) < (dob.month, dob.day))
    )


def age_band_for(dob: date, *, today: date | None = None) -> tuple[str, bool]:
    """Classify a date of birth into an age band and a minor flag."""
    years = age_years(dob, today=today)
    if years < 18:
        return "under_18", True
    if years <= 24:
        return "18_24", False
    if years <= 34:
        return "25_34", False
    if years <= 49:
        return "35_49", False
    return "50_plus", False


async def upsert_profile(
    db: AsyncSession, *, user: User, payload: ApplicantProfileUpdate
) -> ApplicantProfile:
    age_band, is_minor = age_band_for(payload.date_of_birth)
    if is_minor:
        raise PermissionDeniedError(MINOR_MESSAGE)

    profile = await repo.get_profile(db, user.id)
    if profile is None:
        profile = ApplicantProfile(user_id=user.id)
        db.add(profile)

    profile.preferred_name = payload.preferred_name.strip()
    profile.date_of_birth = payload.date_of_birth
    profile.age_band = age_band
    profile.is_minor = is_minor
    profile.lga = payload.lga.strip() if payload.lga else None
    profile.community = payload.community.strip() if payload.community else None
    profile.education_level = payload.education_level
    profile.interests = payload.interests
    profile.skills = payload.skills
    profile.experience = payload.experience

    await db.flush()
    await record_event(
        db,
        action="applicant.profile_updated",
        actor_user_id=user.id,
        target_type="applicant_profile",
        target_id=profile.id,
    )
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_profile(db: AsyncSession, *, user: User) -> ApplicantProfile:
    profile = await repo.get_profile(db, user.id)
    if profile is None:
        raise NotFoundError("No applicant profile yet.")
    return profile


async def save_listing(
    db: AsyncSession, *, user: User, opportunity_id: uuid.UUID
) -> SavedListingView:
    opp = await opp_repo.get_opportunity(db, opportunity_id)
    if opp is None or opp.status not in PUBLIC_STATUSES:
        raise NotFoundError("Listing not found.")

    existing = await repo.get_saved(
        db, user_id=user.id, opportunity_id=opportunity_id
    )
    if existing is not None:
        return _saved_view(existing, opp)

    saved = SavedOpportunity(user_id=user.id, opportunity_id=opportunity_id)
    db.add(saved)
    await db.flush()
    await record_event(
        db,
        action="listing.saved",
        actor_user_id=user.id,
        target_type="opportunity",
        target_id=opp.id,
    )
    await db.commit()
    await db.refresh(saved)
    return _saved_view(saved, opp)


async def unsave_listing(
    db: AsyncSession, *, user: User, opportunity_id: uuid.UUID
) -> None:
    existing = await repo.get_saved(
        db, user_id=user.id, opportunity_id=opportunity_id
    )
    if existing is None:
        return
    await db.delete(existing)
    await record_event(
        db,
        action="listing.unsaved",
        actor_user_id=user.id,
        target_type="opportunity",
        target_id=opportunity_id,
    )
    await db.commit()


async def list_saved(db: AsyncSession, *, user: User) -> list[SavedListingView]:
    rows = await repo.list_saved(db, user.id)
    views: list[SavedListingView] = []
    for saved in rows:
        opp = await opp_repo.get_opportunity(db, saved.opportunity_id)
        if opp is None:
            continue
        views.append(_saved_view(saved, opp))
    return views
