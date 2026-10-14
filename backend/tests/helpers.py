"""Shared API helpers for the Day 6 tests (synthetic data only)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

CSRF = "X-CSRF-Token"


async def login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def verified_provider(
    client, admin_email: str, email: str = "provider@test.local"
) -> str:
    csrf = await login(client, email)
    org = await client.post(
        "/api/v1/providers",
        headers={CSRF: csrf},
        json={
            "name": f"Provider {email}",
            "provider_type": "training_provider",
            "public_contact": "hello@example.test",
            "operating_area": "Awgu LGA",
        },
    )
    assert org.status_code == 201, org.text
    admin_csrf = await login(client, admin_email)
    verdict = await client.post(
        f"/api/v1/admin/moderation/providers/{org.json()['id']}/verification",
        headers={CSRF: admin_csrf},
        json={"decision": "approve", "rationale": "Checked."},
    )
    assert verdict.status_code == 200, verdict.text
    return org.json()["id"]


def listing_payload(**overrides) -> dict:
    payload = {
        "opportunity_type": "scholarship",
        "title": "Awgu secondary scholarship",
        "description": "Tuition support for secondary students in Awgu.",
        "location": "Awgu",
        "application_route": "platform",
        "deadline_at": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
    }
    payload.update(overrides)
    return payload


async def publish_listing(
    client,
    admin_email: str,
    *,
    provider_email: str = "provider@test.local",
    **overrides,
) -> dict:
    """Create, submit and approve a listing; return the approved listing."""
    await verified_provider(client, admin_email, provider_email)
    csrf = await login(client, provider_email)
    created = await client.post(
        "/api/v1/opportunities", headers={CSRF: csrf}, json=listing_payload(**overrides)
    )
    assert created.status_code == 201, created.text
    opp_id = created.json()["id"]
    submitted = await client.post(
        f"/api/v1/opportunities/{opp_id}/submit", headers={CSRF: csrf}
    )
    assert submitted.status_code == 200, submitted.text
    admin_csrf = await login(client, admin_email)
    approved = await client.post(
        f"/api/v1/admin/moderation/listings/{opp_id}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert approved.status_code == 200, approved.text
    return approved.json()


async def adult(client, email: str, name: str = "Ada") -> str:
    csrf = await login(client, email)
    profile = await client.put(
        "/api/v1/me/profile",
        headers={CSRF: csrf},
        json={
            "preferred_name": name,
            "date_of_birth": date(date.today().year - 25, 1, 1).isoformat(),
            "lga": "Awgu",
        },
    )
    assert profile.status_code == 200, profile.text
    return csrf
