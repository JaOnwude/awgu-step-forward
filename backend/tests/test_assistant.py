from __future__ import annotations

import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.features.assistant.interpreter import interpret, redact
from app.features.assistant.models import AIUsageEvent
from tests.helpers import publish_listing

SEARCH = "/api/v1/opportunity-assistant/search"


@pytest.fixture
def ai_on(monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_enabled", True)


def test_redaction_removes_contacts_and_ids():
    cleaned, redacted = redact(
        "Call me on 0803 123 4567 or ada@mail.test, NIN 12345678901"
    )
    assert redacted is True
    assert (
        "0803" not in cleaned and "ada@" not in cleaned and "12345678901" not in cleaned
    )


def test_interpreter_maps_words_to_filters():
    plan = interpret("any scholarship in Mgbowo online")
    assert plan.filters() == {
        "category": "scholarship",
        "location": "Mgbowo",
        "delivery_mode": "remote",
    }
    assert interpret("construction day work near Awgu").category == "local_work"
    assert interpret("solar panels").q == "solar"


async def test_assistant_is_off_by_default_and_search_still_works(client, seeded_admin):
    await publish_listing(client, seeded_admin)
    status = (await client.get("/api/v1/opportunity-assistant/status")).json()
    assert status["enabled"] is False

    disabled = await client.post(SEARCH, json={"query": "scholarship in Awgu"})
    assert disabled.status_code == 503
    assert disabled.json()["error"]["code"] == "assistant_disabled"

    # Exit check for Day 6 (A9 partial): ordinary search is unaffected.
    ordinary = await client.get(
        "/api/v1/opportunities?category=scholarship&location=Awgu"
    )
    assert ordinary.status_code == 200
    assert ordinary.json()["total"] == 1


async def test_assistant_returns_grounded_results_without_storing_the_query(
    client, seeded_admin, session_factory, ai_on
):
    listing = await publish_listing(client, seeded_admin)
    response = await client.post(
        SEARCH, json={"query": "Any scholarship in Awgu? Call me on 08031234567"}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["filters"]["category"] == "scholarship"
    assert body["filters"]["location"] == "Awgu"
    assert body["redacted"] is True
    assert [item["id"] for item in body["items"]] == [listing["id"]]
    assert body["explanation"]

    async with session_factory() as db:
        event = (await db.execute(select(AIUsageEvent))).scalar_one()
    assert event.listing_ids == [listing["id"]]
    assert "0803" not in str(event.filters)


async def test_unmatched_keyword_is_dropped_not_fatal(client, seeded_admin, ai_on):
    await publish_listing(client, seeded_admin)
    body = (await client.post(SEARCH, json={"query": "scholarship zebras"})).json()
    assert body["relaxed"] is True
    assert body["total"] == 1
