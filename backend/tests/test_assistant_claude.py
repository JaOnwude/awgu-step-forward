"""The Claude-backed assistant engine, against a fake Anthropic API.

No real requests are made: the SDK client is given a mock transport that
records each request and replies with a canned Messages API response.
"""

from __future__ import annotations

import json

import anthropic
import httpx2
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.features.assistant import claude_interpreter
from app.features.assistant.models import AIUsageEvent
from tests.helpers import publish_listing

SEARCH = "/api/v1/opportunity-assistant/search"


def _message(payload: dict | str, stop_reason: str = "end_turn") -> dict:
    text = payload if isinstance(payload, str) else json.dumps(payload)
    return {
        "id": "msg_test",
        "type": "message",
        "role": "assistant",
        "model": "claude-opus-5-5",
        "content": [{"type": "text", "text": text}],
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 120, "output_tokens": 40},
    }


@pytest.fixture
def fake_claude(monkeypatch):
    """Turn on the Claude engine and capture what it sends."""
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "assistant_engine", "claude")
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
    state = {"requests": [], "status": 200, "body": _message({})}

    def handler(request: httpx2.Request) -> httpx2.Response:
        state["requests"].append(request)
        return httpx2.Response(state["status"], json=state["body"])

    client = anthropic.AsyncAnthropic(
        api_key="sk-ant-test",
        max_retries=0,
        http_client=anthropic.DefaultAsyncHttpxClient(
            transport=httpx2.MockTransport(handler)
        ),
    )
    monkeypatch.setattr(claude_interpreter, "_client", client)
    return state


async def test_claude_picks_filters_from_a_redacted_query(
    client, seeded_admin, session_factory, fake_claude
):
    listing = await publish_listing(client, seeded_admin)
    fake_claude["body"] = _message(
        {
            "category": "scholarship",
            "location": "Awgu",
            "delivery_mode": None,
            "keyword": None,
            "explanation": [
                "You asked for help with school fees, so: Scholarships.",
                "You mentioned Awgu.",
            ],
        }
    )
    response = await client.post(
        SEARCH,
        json={"query": "help paying school fees in Awgu, my number is 08031234567"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["engine"] == "claude:claude-opus-5-5"
    assert body["fell_back"] is False
    assert body["filters"] == {
        "category": "scholarship",
        "location": "Awgu",
        "delivery_mode": None,
        "q": None,
    }
    assert body["explanation"][0].startswith("You asked for help with school fees")
    assert [item["id"] for item in body["items"]] == [listing["id"]]

    (request,) = fake_claude["requests"]
    sent = json.loads(request.content)
    # Personal details never reach the model.
    assert "0803" not in request.content.decode()
    assert "[removed]" in sent["messages"][0]["content"]
    assert sent["model"] == "claude-opus-5-5"
    assert sent["fallbacks"] == "default"
    assert "server-side-fallback-2026-07-01" in request.headers["anthropic-beta"]
    assert sent["output_config"]["format"]["type"] == "json_schema"
    assert sent["output_config"]["effort"] == "low"

    async with session_factory() as db:
        event = (await db.execute(select(AIUsageEvent))).scalar_one()
    assert event.model == "claude:claude-opus-5-5"
    assert event.outcome == "results"


async def test_invalid_model_output_is_ignored(client, fake_claude):
    fake_claude["body"] = _message(
        {
            "category": "hacking",
            "location": "<script>alert(1)</script>",
            "delivery_mode": "teleport",
            "keyword": "two words",
            "explanation": [],
        }
    )
    body = (await client.post(SEARCH, json={"query": "anything at all"})).json()
    assert body["filters"] == {
        "category": None,
        "location": None,
        "delivery_mode": None,
        "q": None,
    }
    assert body["engine"] == "claude:claude-opus-5-5"


@pytest.mark.parametrize(
    ("status", "body"),
    [
        (500, {"type": "error", "error": {"type": "api_error", "message": "x"}}),
        (
            401,
            {
                "type": "error",
                "error": {"type": "authentication_error", "message": "x"},
            },
        ),
        (200, _message({}, stop_reason="refusal")),
        (200, _message("not json")),
    ],
)
async def test_falls_back_to_rules_when_claude_fails(
    client, seeded_admin, session_factory, fake_claude, status, body
):
    await publish_listing(client, seeded_admin)
    fake_claude["status"] = status
    fake_claude["body"] = body
    response = await client.post(SEARCH, json={"query": "scholarship in Awgu"})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["fell_back"] is True
    assert result["engine"] == "rule-based-interpreter-v1"
    # The rule-based engine still finds the right filters.
    assert result["filters"]["category"] == "scholarship"
    assert result["total"] == 1
    async with session_factory() as db:
        event = (await db.execute(select(AIUsageEvent))).scalar_one()
    assert event.outcome == "fallback_results"


async def test_rules_engine_when_no_api_key(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "assistant_engine", "claude")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    status = (await client.get("/api/v1/opportunity-assistant/status")).json()
    assert status["engine"] == "rule-based-interpreter-v1"
    body = (await client.post(SEARCH, json={"query": "scholarship"})).json()
    assert body["engine"] == "rule-based-interpreter-v1"
    assert body["fell_back"] is False
