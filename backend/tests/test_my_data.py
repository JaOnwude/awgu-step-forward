"""Downloading your data and deleting your account (synthetic data only)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.features.applicant.models import ApplicantProfile, SavedOpportunity
from app.features.applications.models import Application
from app.features.audit.models import AuditEvent
from app.features.identity.models import OtpChallenge, User
from app.features.opportunities.models import Opportunity
from tests.helpers import CSRF, adult, login, publish_listing

EMAIL = "data.owner@test.local"


async def person_with_activity(client, admin_email: str) -> tuple[str, dict]:
    """An applicant with a profile, a saved listing and a tracked application."""
    listing = await publish_listing(
        client,
        admin_email,
        application_route="external",
        external_url="https://example.test/apply",
    )
    csrf = await adult(client, EMAIL)
    saved = await client.post(
        "/api/v1/me/saved", headers={CSRF: csrf}, json={"opportunity_id": listing["id"]}
    )
    assert saved.status_code == 201, saved.text
    tracked = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert tracked.status_code == 201, tracked.text
    return csrf, listing


@pytest.mark.asyncio
async def test_export_holds_everything_but_secrets(client, seeded_admin):
    _, listing = await person_with_activity(client, seeded_admin)
    await client.put(
        "/api/v1/auth/password",
        headers={CSRF: client.cookies.get("awgu_csrf") or ""},
        json={"new_password": "awgu-test-pass-1"},
    )

    response = await client.get("/api/v1/me/export")
    assert response.status_code == 200, response.text
    assert "attachment" in response.headers["content-disposition"]
    data = response.json()

    assert data["account"]["email"] == EMAIL
    assert data["profile"]["preferred_name"] == "Ada"
    assert data["saved_opportunities"][0]["opportunity_title"] == listing["title"]
    assert data["applications"][0]["opportunity_title"] == listing["title"]
    text = response.text
    for secret in ("password_hash", "token_hash", "csrf_token_hash", "code_hash"):
        assert secret not in text


@pytest.mark.asyncio
async def test_export_needs_sign_in(client):
    client.cookies.clear()
    assert (await client.get("/api/v1/me/export")).status_code == 401


@pytest.mark.asyncio
async def test_delete_account_removes_the_person_and_their_data(
    client, seeded_admin, session_factory
):
    csrf, listing = await person_with_activity(client, seeded_admin)

    deleted = await client.request(
        "DELETE", "/api/v1/me", headers={CSRF: csrf}, json={"confirm": "DELETE"}
    )
    assert deleted.status_code == 200, deleted.text

    # Signed out, and the old session no longer works.
    assert (await client.get("/api/v1/auth/me")).status_code == 401

    async with session_factory() as db:
        assert await db.scalar(select(User).where(User.email == EMAIL)) is None
        for model in (ApplicantProfile, SavedOpportunity, Application):
            assert await db.scalar(select(func.count()).select_from(model)) == 0
        assert (
            await db.scalar(
                select(func.count())
                .select_from(OtpChallenge)
                .where(OtpChallenge.destination == EMAIL)
            )
            == 0
        )
        # The listing itself belongs to the provider and stays.
        assert await db.get(Opportunity, uuid.UUID(listing["id"])) is not None
        event = await db.scalar(
            select(AuditEvent).where(AuditEvent.action == "account.deleted")
        )
        assert event is not None
        assert EMAIL not in str(event.redacted_metadata or "")


@pytest.mark.asyncio
async def test_delete_needs_typed_confirmation_and_csrf(client):
    csrf = await login(client, "careful@test.local")
    no_csrf = await client.request("DELETE", "/api/v1/me", json={"confirm": "DELETE"})
    assert no_csrf.status_code == 403
    wrong = await client.request(
        "DELETE", "/api/v1/me", headers={CSRF: csrf}, json={"confirm": "yes"}
    )
    assert wrong.status_code == 422
    assert (await client.get("/api/v1/auth/me")).status_code == 200


@pytest.mark.asyncio
async def test_staff_and_provider_accounts_cannot_self_delete(client, seeded_admin):
    admin_csrf = await login(client, seeded_admin)
    staff = await client.request(
        "DELETE", "/api/v1/me", headers={CSRF: admin_csrf}, json={"confirm": "DELETE"}
    )
    assert staff.status_code == 403
    assert staff.json()["error"]["code"] == "staff_account"

    await publish_listing(client, seeded_admin, provider_email="owner@test.local")
    provider_csrf = await login(client, "owner@test.local")
    provider = await client.request(
        "DELETE",
        "/api/v1/me",
        headers={CSRF: provider_csrf},
        json={"confirm": "DELETE"},
    )
    assert provider.status_code == 409
    assert provider.json()["error"]["code"] == "manages_provider"
