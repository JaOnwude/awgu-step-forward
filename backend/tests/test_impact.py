"""Staff impact dashboard figures (synthetic data only)."""

from __future__ import annotations

import pytest

from tests.helpers import CSRF, adult, login, publish_listing


@pytest.mark.asyncio
async def test_impact_counts_listings_people_and_applications(client, seeded_admin):
    listing = await publish_listing(
        client,
        seeded_admin,
        application_route="external",
        external_url="https://example.test/apply",
    )
    csrf = await adult(client, "awgu.applicant@test.local")
    started = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert started.status_code == 201, started.text
    offered = await client.patch(
        f"/api/v1/applications/{started.json()['id']}/tracking",
        headers={CSRF: csrf},
        json={"status": "offered"},
    )
    assert offered.status_code == 200, offered.text

    await login(client, seeded_admin)
    response = await client.get("/api/v1/admin/impact")
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["includes_demo_data"] is False
    assert body["listings"]["live"] == 1
    assert body["listings"]["live_in_awgu"] == 1
    by_category = body["listings"]["by_category"]
    assert {item["key"]: item["count"] for item in by_category}["scholarship"] == 1
    assert body["providers"]["verified"] == 1
    assert body["people"]["with_profile"] == 1
    assert body["people"]["from_awgu"] == 1
    assert body["applications"]["total"] == 1
    assert body["applications"]["tracked_elsewhere"] == 1
    assert body["applications"]["positive_outcomes"] == 1
    # The weekly trend always has eight weeks, and this week holds the one.
    assert len(body["applications"]["weekly"]) == 8
    assert body["applications"]["weekly"][-1]["count"] == 1


@pytest.mark.asyncio
async def test_impact_is_staff_only(client, seeded_admin):
    client.cookies.clear()
    assert (await client.get("/api/v1/admin/impact")).status_code == 401

    await adult(client, "someone@test.local")
    assert (await client.get("/api/v1/admin/impact")).status_code == 403
