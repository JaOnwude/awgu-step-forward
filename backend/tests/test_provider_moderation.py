from __future__ import annotations

import pytest
from sqlalchemy import select

from app.features.audit.models import AuditEvent

CSRF = "X-CSRF-Token"

PROVIDER_PAYLOAD = {
    "name": "Awgu Skills Centre",
    "provider_type": "training_provider",
    "public_contact": "hello@awguskills.test",
    "operating_area": "Awgu LGA",
}

LISTING_PAYLOAD = {
    "opportunity_type": "training",
    "title": "Solar installation basics",
    "description": "Hands-on training for young people across Awgu.",
    "location": "Awgu",
}


async def _login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def _create_provider(client, csrf: str) -> dict:
    response = await client.post(
        "/api/v1/providers", headers={CSRF: csrf}, json=PROVIDER_PAYLOAD
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _verify_provider(client, admin_csrf: str, provider_id: str) -> dict:
    response = await client.post(
        f"/api/v1/admin/moderation/providers/{provider_id}/verification",
        headers={CSRF: admin_csrf},
        json={"decision": "approve", "rationale": "Registration confirmed."},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _create_listing(client, csrf: str) -> dict:
    response = await client.post(
        "/api/v1/opportunities", headers={CSRF: csrf}, json=LISTING_PAYLOAD
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_provider_verification_and_listing_lifecycle(
    client, seeded_admin, session_factory
):
    provider_csrf = await _login(client, "provider@test.local")
    provider = await _create_provider(client, provider_csrf)
    assert provider["verification_status"] == "pending"

    # An unverified provider cannot create a listing.
    blocked = await client.post(
        "/api/v1/opportunities", headers={CSRF: provider_csrf}, json=LISTING_PAYLOAD
    )
    assert blocked.status_code == 403

    admin_csrf = await _login(client, seeded_admin)
    verified = await _verify_provider(client, admin_csrf, provider["id"])
    assert verified["verification_status"] == "verified"

    provider_csrf = await _login(client, "provider@test.local")
    listing = await _create_listing(client, provider_csrf)
    assert listing["status"] == "draft"
    listing_id = listing["id"]

    # A draft stays private to non-members.
    await _login(client, "stranger@test.local")
    assert (await client.get(f"/api/v1/opportunities/{listing_id}")).status_code == 404

    provider_csrf = await _login(client, "provider@test.local")
    submitted = await client.post(
        f"/api/v1/opportunities/{listing_id}/submit", headers={CSRF: provider_csrf}
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "pending_review"

    # Still private once submitted, until an admin approves.
    await _login(client, "stranger@test.local")
    assert (await client.get(f"/api/v1/opportunities/{listing_id}")).status_code == 404

    admin_csrf = await _login(client, seeded_admin)
    queue = await client.get("/api/v1/admin/moderation/queue")
    assert queue.status_code == 200, queue.text
    assert listing_id in {item["id"] for item in queue.json()["listings"]}

    decision = await client.post(
        f"/api/v1/admin/moderation/listings/{listing_id}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert decision.status_code == 200, decision.text
    assert decision.json()["status"] == "approved"

    # Approved listings become visible to other authenticated users.
    await _login(client, "stranger@test.local")
    assert (await client.get(f"/api/v1/opportunities/{listing_id}")).status_code == 200

    # A material edit returns the approved listing to review.
    provider_csrf = await _login(client, "provider@test.local")
    edited = await client.patch(
        f"/api/v1/opportunities/{listing_id}",
        headers={CSRF: provider_csrf},
        json={"cost_details": "N5,000"},
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["status"] == "pending_review"

    # Every transition is audited (acceptance criterion A3).
    async with session_factory() as db:
        result = await db.execute(select(AuditEvent.action))
        actions = {row[0] for row in result.all()}
    assert {
        "provider.requested",
        "provider.verified",
        "listing.draft_created",
        "listing.submitted",
        "listing.approve",
        "listing.updated",
    } <= actions


@pytest.mark.asyncio
async def test_reject_requires_reason(client, seeded_admin):
    provider_csrf = await _login(client, "p2@test.local")
    provider = await _create_provider(client, provider_csrf)
    admin_csrf = await _login(client, seeded_admin)
    await _verify_provider(client, admin_csrf, provider["id"])

    provider_csrf = await _login(client, "p2@test.local")
    listing = await _create_listing(client, provider_csrf)
    await client.post(
        f"/api/v1/opportunities/{listing['id']}/submit", headers={CSRF: provider_csrf}
    )

    admin_csrf = await _login(client, seeded_admin)
    missing = await client.post(
        f"/api/v1/admin/moderation/listings/{listing['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "reject"},
    )
    assert missing.status_code == 422

    rejected = await client.post(
        f"/api/v1/admin/moderation/listings/{listing['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "reject", "reason": "Eligibility details are missing."},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "rejected"
    assert rejected.json()["decision_reason"] == "Eligibility details are missing."


@pytest.mark.asyncio
async def test_moderation_requires_staff(client):
    await _login(client, "p3@test.local")
    response = await client.get("/api/v1/admin/moderation/queue")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_provider_write_requires_csrf(client):
    await _login(client, "p4@test.local")
    response = await client.post("/api/v1/providers", json=PROVIDER_PAYLOAD)
    assert response.status_code == 403
