"""Sign-in codes by real email (Brevo / Resend) and the demo-mode switch."""

from __future__ import annotations

import json
import re

import httpx
import pytest

from app.core.config import get_settings
from app.integrations.messaging import BrevoEmailAdapter, ResendEmailAdapter

REQUEST = "/api/v1/auth/otp/request"
VERIFY = "/api/v1/auth/otp/verify"


@pytest.fixture
def outbox(monkeypatch):
    """Capture what would be POSTed to the email provider; nothing is sent."""
    sent: list[httpx.Request] = []
    state = {"status": 201}

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(state["status"], json={"messageId": "test"})

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(BrevoEmailAdapter, "transport", transport)
    monkeypatch.setattr(ResendEmailAdapter, "transport", transport)
    return {"sent": sent, "state": state}


def _configure(monkeypatch, *, provider="console", demo=True, key="test-key"):
    settings = get_settings()
    monkeypatch.setattr(settings, "email_provider", provider)
    monkeypatch.setattr(settings, "email_api_key", key)
    monkeypatch.setattr(settings, "email_from_address", "hello@stepforward.test")
    monkeypatch.setattr(settings, "dev_auth_enabled", demo)
    monkeypatch.setattr(settings, "sms_provider", "console")


def _code_from(request: httpx.Request, field: str) -> str:
    body = json.loads(request.content)
    match = re.search(r"\b(\d{6})\b", body[field])
    assert match, body[field]
    return match.group(1)


async def test_brevo_emails_the_code_and_it_signs_you_in(client, outbox, monkeypatch):
    _configure(monkeypatch, provider="brevo", demo=False)
    response = await client.post(
        REQUEST, json={"channel": "email", "destination": "Ada@Example.com"}
    )
    assert response.status_code == 200, response.text
    # A real email went out, so the code is never shown on screen.
    assert response.json()["dev_code"] is None

    (request,) = outbox["sent"]
    assert str(request.url) == "https://api.brevo.com/v3/smtp/email"
    assert request.headers["api-key"] == "test-key"
    body = json.loads(request.content)
    assert body["to"] == [{"email": "ada@example.com"}]
    assert body["sender"]["email"] == "hello@stepforward.test"
    # Kept off the lock screen: no code in the subject.
    assert not re.search(r"\d{6}", body["subject"])
    code = _code_from(request, "textContent")
    assert code in body["htmlContent"]

    signed_in = await client.post(
        VERIFY,
        json={"channel": "email", "destination": "ada@example.com", "code": code},
    )
    assert signed_in.status_code == 200, signed_in.text
    assert signed_in.json()["user"]["email"] == "ada@example.com"


async def test_resend_uses_its_own_api_format(client, outbox, monkeypatch):
    _configure(monkeypatch, provider="resend", demo=False)
    outbox["state"]["status"] = 200
    response = await client.post(
        REQUEST, json={"channel": "email", "destination": "obi@example.com"}
    )
    assert response.status_code == 200, response.text
    (request,) = outbox["sent"]
    assert str(request.url) == "https://api.resend.com/emails"
    assert request.headers["authorization"] == "Bearer test-key"
    body = json.loads(request.content)
    assert body["to"] == ["obi@example.com"]
    assert body["from"] == "Awgu StepForward <hello@stepforward.test>"
    _code_from(request, "text")


async def test_failed_send_is_reported_and_can_be_retried(client, outbox, monkeypatch):
    _configure(monkeypatch, provider="brevo", demo=False)
    outbox["state"]["status"] = 400
    payload = {"channel": "email", "destination": "retry@example.com"}
    failed = await client.post(REQUEST, json=payload)
    assert failed.status_code == 503
    assert failed.json()["error"]["code"] == "email_send_failed"

    # No cooldown penalty for a send that never arrived.
    outbox["state"]["status"] = 201
    assert (await client.post(REQUEST, json=payload)).status_code == 200


async def test_missing_api_key_fails_safely(client, outbox, monkeypatch):
    _configure(monkeypatch, provider="brevo", demo=False, key="")
    response = await client.post(
        REQUEST, json={"channel": "email", "destination": "nokey@example.com"}
    )
    assert response.status_code == 503
    assert outbox["sent"] == []


async def test_without_demo_mode_undeliverable_channels_are_refused(
    client, monkeypatch
):
    _configure(monkeypatch, provider="console", demo=False)
    email = await client.post(
        REQUEST, json={"channel": "email", "destination": "a@example.com"}
    )
    assert email.status_code == 503
    assert email.json()["error"]["code"] == "email_unavailable"
    phone = await client.post(
        REQUEST, json={"channel": "phone", "destination": "08031234567"}
    )
    assert phone.status_code == 422
    assert phone.json()["error"]["code"] == "phone_unavailable"
    # Demo sign-in is off too.
    dev = await client.post("/api/v1/auth/dev-login", json={"email": "a@example.com"})
    assert dev.status_code == 401


async def test_demo_mode_shows_the_code_when_nothing_is_delivered(client, monkeypatch):
    _configure(monkeypatch, provider="console", demo=True)
    response = await client.post(
        REQUEST, json={"channel": "phone", "destination": "08031234567"}
    )
    assert response.status_code == 200
    assert re.fullmatch(r"\d{6}", response.json()["dev_code"])


async def test_invalid_email_is_rejected(client, monkeypatch):
    _configure(monkeypatch, provider="console", demo=True)
    response = await client.post(
        REQUEST, json={"channel": "email", "destination": "not-an-email"}
    )
    assert response.status_code == 422


async def test_auth_config_describes_the_server(client, monkeypatch):
    _configure(monkeypatch, provider="brevo", demo=False)
    assert (await client.get("/api/v1/auth/config")).json() == {
        "demo_mode": False,
        "email_codes_delivered": True,
        "phone_sign_in": False,
    }
    _configure(monkeypatch, provider="console", demo=True)
    assert (await client.get("/api/v1/auth/config")).json() == {
        "demo_mode": True,
        "email_codes_delivered": False,
        "phone_sign_in": True,
    }
