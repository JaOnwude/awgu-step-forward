from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.features.opportunities import service

CSRF = "X-CSRF-Token"


def _provider_payload(name: str) -> dict:
    return {
        "name": name,
        "provider_type": "training_provider",
        "public_contact": "hello@example.test",
        "operating_area": "Awgu LGA",
    }


def _listing_payload(**overrides) -> dict:
    payload = {
        "opportunity_type": "training",
        "title": "Solar installation basics",
        "description": "Hands-on training for young people across Awgu.",
        "location": "Awgu",
    }
    payload.update(overrides)
    return payload


async def _login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def _verified_provider(client, *, admin_email: str, email: str, name: str) -> str:
    csrf = await _login(client, email)
    response = await client.post(
        "/api/v1/providers", headers={CSRF: csrf}, json=_provider_payload(name)
    )
    assert response.status_code == 201, response.text
    org = response.json()

    admin_csrf = await _login(client, admin_email)
    verdict = await client.post(
        f"/api/v1/admin/moderation/providers/{org['id']}/verification",
        headers={CSRF: admin_csrf},
        json={"decision": "approve", "rationale": "Registration confirmed."},
    )
    assert verdict.status_code == 200, verdict.text
    return await _login(client, email)


async def _create_listing(client, csrf: str, payload: dict) -> dict:
    response = await client.post(
        "/api/v1/opportunities", headers={CSRF: csrf}, json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _publish(
    client, *, provider_email: str, admin_email: str, payload: dict
) -> dict:
    csrf = await _login(client, provider_email)
    listing = await _create_listing(client, csrf, payload)
    submitted = await client.post(
        f"/api/v1/opportunities/{listing['id']}/submit", headers={CSRF: csrf}
    )
    assert submitted.status_code == 200, submitted.text

    admin_csrf = await _login(client, admin_email)
    decision = await client.post(
        f"/api/v1/admin/moderation/listings/{listing['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert decision.status_code == 200, decision.text
    return decision.json()


@pytest.mark.asyncio
async def test_visitor_browses_without_account_and_expired_is_excluded(
    client, seeded_admin, session_factory
):
    now = datetime.now(UTC)
    future = (now + timedelta(days=30)).isoformat()
    past = (now - timedelta(days=2)).isoformat()

    await _verified_provider(
        client, admin_email=seeded_admin, email="owner@test.local", name="Awgu Skills"
    )
    live = await _publish(
        client,
        provider_email="owner@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(title="Live training", deadline_at=future),
    )
    stale = await _publish(
        client,
        provider_email="owner@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(title="Stale training", deadline_at=past),
    )

    csrf = await _login(client, "owner@test.local")
    draft = await _create_listing(
        client, csrf, _listing_payload(title="Unpublished draft")
    )

    # A visitor with no session can browse the directory.
    client.cookies.clear()
    listing = await client.get("/api/v1/opportunities")
    assert listing.status_code == 200, listing.text
    body = listing.json()
    ids = {item["id"] for item in body["items"]}
    assert live["id"] in ids
    assert draft["id"] not in ids  # drafts are never public
    assert stale["id"] not in ids  # past deadlines drop from default results
    assert body["total"] == 1
    assert body["items"][0]["provider"]["verification_status"] == "verified"

    # Expired detail stays reachable but is labelled, rather than hidden.
    detail = await client.get(f"/api/v1/opportunities/{stale['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["is_expired"] is True

    # The expiry job flips overdue approved listings to `expired`.
    async with session_factory() as db:
        count = await service.expire_overdue_listings(db)
        assert count == 1
    client.cookies.clear()
    detail = await client.get(f"/api/v1/opportunities/{stale['id']}")
    assert detail.json()["status"] == "expired"


@pytest.mark.asyncio
async def test_search_filters_sort_and_awgu_first_ranking(client, seeded_admin):
    now = datetime.now(UTC)
    await _verified_provider(
        client,
        admin_email=seeded_admin,
        email="multi@test.local",
        name="Multi Provider",
    )
    awgu = await _publish(
        client,
        provider_email="multi@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(
            title="Awgu apprenticeship",
            location="Awgu LGA",
            opportunity_type="apprenticeship",
            deadline_at=(now + timedelta(days=60)).isoformat(),
        ),
    )
    enugu = await _publish(
        client,
        provider_email="multi@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(
            title="Enugu scholarship",
            location="Enugu North",
            opportunity_type="scholarship",
            delivery_mode="remote",
            deadline_at=(now + timedelta(days=10)).isoformat(),
        ),
    )

    client.cookies.clear()

    # Awgu listings rank first under the default relevance sort.
    default = (await client.get("/api/v1/opportunities")).json()
    assert default["items"][0]["id"] == awgu["id"]
    assert default["items"][0]["is_closing_soon"] is False

    by_category = (
        await client.get("/api/v1/opportunities?category=scholarship")
    ).json()
    assert by_category["total"] == 1
    assert by_category["items"][0]["id"] == enugu["id"]
    # A deadline within the closing window is flagged for the client.
    assert by_category["items"][0]["is_closing_soon"] is True

    by_location = (await client.get("/api/v1/opportunities?location=Awgu")).json()
    assert {item["id"] for item in by_location["items"]} == {awgu["id"]}

    by_keyword = (await client.get("/api/v1/opportunities?q=scholarship")).json()
    assert {item["id"] for item in by_keyword["items"]} == {enugu["id"]}

    by_mode = (await client.get("/api/v1/opportunities?delivery_mode=remote")).json()
    assert {item["id"] for item in by_mode["items"]} == {enugu["id"]}

    # Soonest deadline sorts first.
    by_deadline = (
        await client.get("/api/v1/opportunities?sort=deadline")
    ).json()
    assert by_deadline["items"][0]["id"] == enugu["id"]

    # Bounded filters reject unknown values.
    assert (
        await client.get("/api/v1/opportunities?category=not-a-type")
    ).status_code == 422


@pytest.mark.asyncio
async def test_featured_listing_ranks_first_and_shows_its_source(
    client, seeded_admin, session_factory
):
    from app.features.opportunities.models import Opportunity

    now = datetime.now(UTC)
    await _verified_provider(
        client, admin_email=seeded_admin, email="feat@test.local", name="Feature Org"
    )
    awgu = await _publish(
        client,
        provider_email="feat@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(
            title="Awgu listing", deadline_at=(now + timedelta(days=5)).isoformat()
        ),
    )
    pinned = await _publish(
        client,
        provider_email="feat@test.local",
        admin_email=seeded_admin,
        payload=_listing_payload(
            title="Enugu bootcamp",
            location="Enugu",
            deadline_at=(now + timedelta(days=90)).isoformat(),
        ),
    )
    async with session_factory() as db:
        opp = await db.get(Opportunity, uuid.UUID(pinned["id"]))
        opp.is_featured = True
        opp.image_url = "/images/listings/coding.webp"
        opp.source_url = "https://example.test/announcement"
        await db.commit()

    client.cookies.clear()
    items = (await client.get("/api/v1/opportunities")).json()["items"]
    # Featured beats both the Awgu-first rule and the sooner deadline.
    assert [item["id"] for item in items] == [pinned["id"], awgu["id"]]
    assert items[0]["is_featured"] is True
    assert items[0]["image_url"] == "/images/listings/coding.webp"
    assert items[0]["source_url"] == "https://example.test/announcement"
    assert items[1]["is_featured"] is False
    assert items[1]["source_url"] is None


@pytest.mark.asyncio
async def test_detail_visibility_rules(client, seeded_admin):
    csrf = await _verified_provider(
        client, admin_email=seeded_admin, email="owner2@test.local", name="Owner Two"
    )
    draft = await _create_listing(client, csrf, _listing_payload(title="Private draft"))

    client.cookies.clear()
    assert (await client.get(f"/api/v1/opportunities/{draft['id']}")).status_code == 401

    await _login(client, "stranger2@test.local")
    assert (await client.get(f"/api/v1/opportunities/{draft['id']}")).status_code == 404

    await _login(client, "owner2@test.local")
    mine = await client.get(f"/api/v1/opportunities/{draft['id']}")
    assert mine.status_code == 200, mine.text
    assert mine.json()["title"] == "Private draft"
