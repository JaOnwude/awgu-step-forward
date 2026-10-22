from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class CountItem(BaseModel):
    key: str
    count: int


class WeekPoint(BaseModel):
    """Applications started in the week beginning `week_start` (a Monday)."""

    week_start: date
    count: int


class ListingStats(BaseModel):
    live: int
    live_in_awgu: int
    closing_soon: int
    pending_review: int
    public_announcements: int
    by_category: list[CountItem]


class ProviderStats(BaseModel):
    verified: int
    pending: int
    suspended: int


class PeopleStats(BaseModel):
    applicants: int
    with_profile: int
    from_awgu: int
    by_town: list[CountItem]
    saved_listings: int


class ApplicationStats(BaseModel):
    total: int
    last_30_days: int
    in_platform: int
    tracked_elsewhere: int
    positive_outcomes: int
    by_status: list[CountItem]
    weekly: list[WeekPoint]


class SessionStats(BaseModel):
    upcoming: int
    held: int
    registrations: int
    attended: int


class TrustStats(BaseModel):
    reports_open: int
    reports_urgent_open: int
    reports_resolved: int
    listings_suspended: int
    reminders_sent: int


class ImpactStats(BaseModel):
    generated_at: datetime
    #: True while synthetic demo activity is in the database, so the page
    #: can say so instead of passing it off as real use.
    includes_demo_data: bool
    listings: ListingStats
    providers: ProviderStats
    people: PeopleStats
    applications: ApplicationStats
    sessions: SessionStats
    trust: TrustStats
