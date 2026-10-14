from __future__ import annotations

from pydantic import BaseModel, Field

from app.features.opportunities.schemas import OpportunityCard


class AssistantStatus(BaseModel):
    enabled: bool
    engine: str
    notice: str


class AssistantQuery(BaseModel):
    query: str = Field(min_length=2, max_length=300)


class AssistantFilters(BaseModel):
    category: str | None = None
    location: str | None = None
    delivery_mode: str | None = None
    q: str | None = None


class AssistantResult(BaseModel):
    filters: AssistantFilters
    explanation: list[str]
    #: True when contact or ID details were removed from the query.
    redacted: bool
    #: True when the keyword was dropped because it matched nothing.
    relaxed: bool
    items: list[OpportunityCard]
    total: int
    engine: str
    disclaimer: str
