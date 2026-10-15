"""Day 7: restore and expire for listings, suspend and restore for providers (R20)."""

from __future__ import annotations

from sqlalchemy import select

from app.features.audit.models import AuditEvent
from tests.helpers import CSRF, login, publish_listing

LISTINGS = "/api/v1/admin/moderation/listings"
PROVIDERS = "/api/v1/admin/moderation/providers"


async def _decide_listing(client, csrf, listing_id, decision, reason=None):
    return await client.post(
        f"{LISTINGS}/{listing_id}/decision",
        headers={CSRF: csrf},
        json={"decision": decision, "reason": reason},
    )


async def _public_ids(client) -> list[str]:
    response = await client.get("/api/v1/opportunities")
    return [item["id"] for item in response.json()["items"]]


async def _actions(session_factory) -> list[str]:
    async with session_factory() as db:
        return list((await db.execute(select(AuditEvent.action))).scalars().all())


async def test_suspended_listing_can_be_restored(client, seeded_admin, session_factory):
    listing = await publish_listing(client, seeded_admin)
    csrf = await login(client, seeded_admin)

    suspended = await _decide_listing(
        client, csrf, listing["id"], "suspend", "Check pay."
    )
    assert suspended.json()["status"] == "suspended"
    assert listing["id"] not in await _public_ids(client)

    no_reason = await _decide_listing(client, csrf, listing["id"], "restore")
    assert no_reason.status_code == 422

    restored = await _decide_listing(
        client, csrf, listing["id"], "restore", "Pay confirmed with employer."
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["status"] == "approved"
    assert listing["id"] in await _public_ids(client)

    # Restore only applies to suspended listings.
    again = await _decide_listing(client, csrf, listing["id"], "restore", "Twice.")
    assert again.status_code == 409

    assert {"listing.suspend", "listing.restore"} <= set(
        await _actions(session_factory)
    )


async def test_staff_can_expire_a_live_listing(client, seeded_admin, session_factory):
    listing = await publish_listing(client, seeded_admin)
    csrf = await login(client, seeded_admin)

    expired = await _decide_listing(client, csrf, listing["id"], "expire")
    assert expired.status_code == 200, expired.text
    assert expired.json()["status"] == "expired"

    # Gone from the directory, but the page still opens and says it closed.
    assert listing["id"] not in await _public_ids(client)
    detail = await client.get(f"/api/v1/opportunities/{listing['id']}")
    assert detail.status_code == 200
    assert detail.json()["is_expired"] is True

    twice = await _decide_listing(client, csrf, listing["id"], "expire")
    assert twice.status_code == 409
    assert "listing.expire" in await _actions(session_factory)


async def test_suspending_a_provider_takes_its_listings_offline(
    client, seeded_admin, session_factory
):
    listing = await publish_listing(client, seeded_admin)
    provider_id = listing["organization_id"]
    csrf = await login(client, seeded_admin)

    suspended = await client.post(
        f"{PROVIDERS}/{provider_id}/verification",
        headers={CSRF: csrf},
        json={"decision": "suspend", "rationale": "Fee complaints under review."},
    )
    assert suspended.status_code == 200, suspended.text
    assert suspended.json()["verification_status"] == "suspended"
    assert listing["id"] not in await _public_ids(client)

    catalog = (await client.get("/api/v1/admin/moderation/catalog")).json()
    assert provider_id in [p["id"] for p in catalog["suspended_providers"]]
    assert listing["id"] in [item["id"] for item in catalog["suspended_listings"]]

    # The listing cannot come back while its provider is suspended.
    blocked = await _decide_listing(client, csrf, listing["id"], "restore", "Too soon.")
    assert blocked.status_code == 409

    restored = await client.post(
        f"{PROVIDERS}/{provider_id}/verification",
        headers={CSRF: csrf},
        json={"decision": "restore", "rationale": "Complaints resolved."},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["verification_status"] == "verified"
    # Listings stay suspended until staff restore each one.
    assert listing["id"] not in await _public_ids(client)
    back = await _decide_listing(client, csrf, listing["id"], "restore", "Rechecked.")
    assert back.status_code == 200, back.text
    assert listing["id"] in await _public_ids(client)

    actions = set(await _actions(session_factory))
    assert {"provider.suspended", "provider.restored", "listing.suspend"} <= actions


async def test_only_verified_providers_can_be_suspended(client, seeded_admin):
    listing = await publish_listing(client, seeded_admin)
    csrf = await login(client, seeded_admin)
    restore_verified = await client.post(
        f"{PROVIDERS}/{listing['organization_id']}/verification",
        headers={CSRF: csrf},
        json={"decision": "restore", "rationale": "Not suspended."},
    )
    assert restore_verified.status_code == 409


async def test_catalog_is_staff_only(client):
    await login(client, "visitor@test.local")
    response = await client.get("/api/v1/admin/moderation/catalog")
    assert response.status_code == 403
