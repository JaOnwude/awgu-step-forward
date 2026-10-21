"""The hourly scheduled-jobs endpoint (reminders + expiry), token protected."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.features.audit.models import AuditEvent
from app.features.opportunities.models import Opportunity
from tests.helpers import CSRF, adult, publish_listing

RUN = "/api/v1/internal/jobs/run"
TOKEN = "test-job-token-0123456789"


@pytest.fixture
def job_token(monkeypatch):
    monkeypatch.setattr(get_settings(), "jobs_token", TOKEN)
    return {"Authorization": f"Bearer {TOKEN}"}


async def test_endpoint_is_off_without_a_configured_token(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "jobs_token", "")
    response = await client.post(RUN, headers={"Authorization": "Bearer anything"})
    assert response.status_code == 404


async def test_wrong_or_missing_token_is_refused(client, job_token):
    assert (await client.post(RUN)).status_code == 403
    wrong = await client.post(RUN, headers={"Authorization": "Bearer nope"})
    assert wrong.status_code == 403
    assert wrong.json()["error"]["code"] == "invalid_job_token"


async def test_run_expires_overdue_listings_and_sends_reminders(
    client, seeded_admin, session_factory, job_token
):
    soon = await publish_listing(
        client,
        seeded_admin,
        deadline_at=(datetime.now(UTC) + timedelta(days=2)).isoformat(),
    )
    overdue = await publish_listing(
        client, seeded_admin, provider_email="p2@test.local"
    )
    # Move one deadline into the past, as if time had passed.
    async with session_factory() as db:
        row = await db.get(Opportunity, uuid.UUID(overdue["id"]))
        row.deadline_at = datetime.now(UTC) - timedelta(hours=1)
        await db.commit()

    csrf = await adult(client, "scheduled@test.local")
    await client.post(
        "/api/v1/me/saved", headers={CSRF: csrf}, json={"opportunity_id": soon["id"]}
    )

    first = await client.post(RUN, headers=job_token)
    assert first.status_code == 200, first.text
    assert first.json() == {
        "expired_listings": 1,
        "deadline_reminders": 1,
        "session_reminders": 0,
    }

    # Safe to run again: nothing is expired or sent twice.
    second = await client.post(RUN, headers=job_token)
    assert second.json() == {
        "expired_listings": 0,
        "deadline_reminders": 0,
        "session_reminders": 0,
    }

    async with session_factory() as db:
        status = await db.scalar(
            select(Opportunity.status).where(Opportunity.id == uuid.UUID(overdue["id"]))
        )
        runs = (
            (
                await db.execute(
                    select(AuditEvent).where(AuditEvent.action == "job.scheduled_run")
                )
            )
            .scalars()
            .all()
        )
    assert status == "expired"
    assert len(runs) == 2
