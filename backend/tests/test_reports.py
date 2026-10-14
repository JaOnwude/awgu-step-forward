from __future__ import annotations

import uuid

from sqlalchemy import select

from app.features.audit.models import AuditEvent
from app.features.reports.models import Report
from tests.helpers import CSRF, adult, login, publish_listing


async def test_anyone_can_report_and_staff_see_urgent_first(client, seeded_admin):
    listing = await publish_listing(client, seeded_admin)
    await client.post(
        "/api/v1/auth/logout", headers={CSRF: await login(client, "x@test.local")}
    )

    routine = await client.post(
        "/api/v1/reports",
        json={
            "target_type": "opportunity",
            "target_id": listing["id"],
            "category": "inaccurate",
        },
    )
    assert routine.status_code == 201, routine.text
    urgent = await client.post(
        "/api/v1/reports",
        json={
            "target_type": "opportunity",
            "target_id": listing["id"],
            "category": "fee_request",
            "details": "They asked me to pay N5,000 to apply.",
        },
    )
    assert urgent.status_code == 201, urgent.text
    assert "same day" in urgent.json()["message"]

    await login(client, seeded_admin)
    queue = (await client.get("/api/v1/admin/moderation/queue")).json()["reports"]
    assert [r["category"] for r in queue] == ["fee_request", "inaccurate"]
    assert queue[0]["urgent"] is True
    assert queue[0]["target_title"] == listing["title"]
    # The staff view never reveals who reported.
    assert queue[0]["signed_in_reporter"] is False
    assert "reporter_fingerprint" not in queue[0]


async def test_cannot_report_hidden_or_unknown_listing(client, seeded_admin):
    response = await client.post(
        "/api/v1/reports",
        json={
            "target_type": "opportunity",
            "target_id": str(uuid.uuid4()),
            "category": "fraud",
        },
    )
    assert response.status_code == 404


async def test_reports_are_rate_limited(client, seeded_admin):
    listing = await publish_listing(client, seeded_admin)
    await client.post(
        "/api/v1/auth/logout", headers={CSRF: await login(client, "y@test.local")}
    )
    body = {
        "target_type": "opportunity",
        "target_id": listing["id"],
        "category": "other",
    }
    for _ in range(5):
        assert (await client.post("/api/v1/reports", json=body)).status_code == 201
    limited = await client.post("/api/v1/reports", json=body)
    assert limited.status_code == 429


async def test_signed_in_report_requires_csrf(client, seeded_admin):
    listing = await publish_listing(client, seeded_admin)
    csrf = await adult(client, "reporter@test.local")
    body = {
        "target_type": "opportunity",
        "target_id": listing["id"],
        "category": "unsafe",
    }
    assert (await client.post("/api/v1/reports", json=body)).status_code == 403
    assert (
        await client.post("/api/v1/reports", json=body, headers={CSRF: csrf})
    ).status_code == 201


async def test_staff_can_suspend_reported_listing(
    client, seeded_admin, session_factory
):
    listing = await publish_listing(client, seeded_admin)
    await client.post(
        "/api/v1/auth/logout", headers={CSRF: await login(client, "z@test.local")}
    )
    reported = await client.post(
        "/api/v1/reports",
        json={
            "target_type": "opportunity",
            "target_id": listing["id"],
            "category": "fraud",
        },
    )
    assert reported.status_code == 201, reported.text
    admin_csrf = await login(client, seeded_admin)
    report_id = (await client.get("/api/v1/admin/moderation/queue")).json()["reports"][
        0
    ]["id"]

    no_note = await client.post(
        f"/api/v1/admin/moderation/reports/{report_id}/decision",
        headers={CSRF: admin_csrf},
        json={"action": "suspend_target", "note": ""},
    )
    assert no_note.status_code == 422

    decided = await client.post(
        f"/api/v1/admin/moderation/reports/{report_id}/decision",
        headers={CSRF: admin_csrf},
        json={"action": "suspend_target", "note": "Confirmed fee request by phone."},
    )
    assert decided.status_code == 200, decided.text
    assert decided.json()["status"] == "resolved"
    assert decided.json()["resolution"] == "target_suspended"

    await client.post("/api/v1/auth/logout", headers={CSRF: admin_csrf})
    hidden = await client.get(f"/api/v1/opportunities/{listing['id']}")
    assert hidden.status_code == 401
    public = await client.get("/api/v1/opportunities")
    assert listing["id"] not in [item["id"] for item in public.json()["items"]]

    async with session_factory() as db:
        actions = set((await db.execute(select(AuditEvent.action))).scalars().all())
        report = (await db.execute(select(Report))).scalar_one()
    assert {"report.created", "report.target_suspended", "listing.suspend"} <= actions
    assert report.status == "resolved"
