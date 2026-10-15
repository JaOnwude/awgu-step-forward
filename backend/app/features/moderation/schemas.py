from __future__ import annotations

from pydantic import BaseModel

from app.features.opportunities.schemas import OpportunityView
from app.features.providers.schemas import ProviderView
from app.features.reports.schemas import ReportView
from app.features.sessions.schemas import SessionManageOut


class ModerationQueue(BaseModel):
    providers: list[ProviderView]
    listings: list[OpportunityView]
    sessions: list[SessionManageOut]
    reports: list[ReportView]


class ModerationCatalog(BaseModel):
    """Published and suspended items, for suspend / expire / restore (R20)."""

    live_listings: list[OpportunityView]
    suspended_listings: list[OpportunityView]
    verified_providers: list[ProviderView]
    suspended_providers: list[ProviderView]
