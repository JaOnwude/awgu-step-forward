from __future__ import annotations

from pydantic import BaseModel

from app.features.opportunities.schemas import OpportunityView
from app.features.providers.schemas import ProviderView


class ModerationQueue(BaseModel):
    providers: list[ProviderView]
    listings: list[OpportunityView]
