from __future__ import annotations

from tests.helpers import CSRF, adult, login, publish_listing


async def _external_listing(client, admin):
    return await publish_listing(
        client,
        admin,
        application_route="external",
        external_url="https://example.test/apply",
    )


async def test_track_external_application(client, seeded_admin):
    listing = await _external_listing(client, seeded_admin)
    csrf = await adult(client, "tracker@test.local")

    started = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert started.status_code == 201, started.text
    app = started.json()
    assert app["route"] == "external"
    assert app["status"] == "started"

    # Starting twice returns the same record.
    again = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert again.json()["id"] == app["id"]

    updated = await client.patch(
        f"/api/v1/applications/{app['id']}/tracking",
        headers={CSRF: csrf},
        json={"status": "submitted", "private_note": "Sent CV by email on Monday."},
    )
    assert updated.status_code == 200, updated.text
    detail = updated.json()
    assert detail["status"] == "submitted"
    assert detail["private_note"] == "Sent CV by email on Monday."
    assert [e["to_status"] for e in detail["history"]] == ["started", "submitted"]
    # Every tracked status is applicant-reported, never provider-confirmed (R28).
    assert {e["source"] for e in detail["history"]} == {"applicant"}

    listed = await client.get("/api/v1/applications")
    assert listed.json()[0]["route"] == "external"


async def test_tracked_application_cannot_use_platform_actions(client, seeded_admin):
    listing = await _external_listing(client, seeded_admin)
    csrf = await adult(client, "mixed@test.local")
    app = (
        await client.post(
            "/api/v1/applications/tracked",
            headers={CSRF: csrf},
            json={"opportunity_id": listing["id"]},
        )
    ).json()
    submit = await client.post(
        f"/api/v1/applications/{app['id']}/submit",
        headers={CSRF: csrf, "Idempotency-Key": "k1"},
    )
    assert submit.status_code == 409


async def test_platform_listing_cannot_be_tracked(client, seeded_admin):
    listing = await publish_listing(client, seeded_admin)
    csrf = await adult(client, "platform@test.local")
    response = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert response.status_code == 422


async def test_tracking_requires_profile(client, seeded_admin):
    listing = await _external_listing(client, seeded_admin)
    csrf = await login(client, "noprofile@test.local")
    response = await client.post(
        "/api/v1/applications/tracked",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert response.status_code == 403
