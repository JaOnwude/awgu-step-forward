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
