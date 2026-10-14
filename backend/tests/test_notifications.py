from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.features.notifications.models import Notification
from app.integrations.messaging import mask_destination
from tests.helpers import CSRF, adult, login, publish_listing, verified_provider

PREFS = "/api/v1/me/notification-preferences"


async def test_preferences_default_and_require_verified_channel(client):
    csrf = await adult(client, "prefs@test.local")
    prefs = (await client.get(PREFS)).json()
    assert prefs["email_enabled"] is False and prefs["sms_enabled"] is False
    assert prefs["deadline_reminders"] is True
    assert prefs["marketing_opt_in"] is False
    assert prefs["email_available"] is True  # dev login verifies the email
    assert prefs["sms_available"] is False

    no_phone = await client.put(
        PREFS,
        headers={CSRF: csrf},
        json={
            "email_enabled": False,
            "sms_enabled": True,
            "deadline_reminders": True,
            "session_reminders": True,
        },
    )
    assert no_phone.status_code == 422

    ok = await client.put(
        PREFS,
        headers={CSRF: csrf},
        json={
            "email_enabled": True,
            "sms_enabled": False,
            "deadline_reminders": True,
            "session_reminders": False,
        },
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["email_enabled"] is True


async def test_deadline_reminder_is_sent_once_on_chosen_channels(
    client, seeded_admin, session_factory
):
    listing = await publish_listing(
        client,
        seeded_admin,
        deadline_at=(datetime.now(UTC) + timedelta(days=2)).isoformat(),
    )
    csrf = await adult(client, "saver@test.local")
    await client.post(
        "/api/v1/me/saved", headers={CSRF: csrf}, json={"opportunity_id": listing["id"]}
    )
    await client.put(
        PREFS,
        headers={CSRF: csrf},
        json={
            "email_enabled": True,
            "sms_enabled": False,
            "deadline_reminders": True,
            "session_reminders": True,
        },
    )

    admin_csrf = await login(client, seeded_admin)
    first = await client.post(
        "/api/v1/admin/jobs/reminders", headers={CSRF: admin_csrf}
    )
    assert first.status_code == 200, first.text
    assert first.json()["deadline_reminders"] == 1
    second = await client.post(
        "/api/v1/admin/jobs/reminders", headers={CSRF: admin_csrf}
    )
    assert second.json()["deadline_reminders"] == 0  # deduplicated

    csrf = await login(client, "saver@test.local")
    inbox = (await client.get("/api/v1/me/notifications")).json()
    assert inbox["unread"] == 1
    assert listing["title"] in inbox["items"][0]["body"]

    async with session_factory() as db:
        rows = (await db.execute(select(Notification))).scalars().all()
    assert sorted(r.channel for r in rows) == ["email", "in_app"]
    email = next(r for r in rows if r.channel == "email")
    assert email.status == "sent" and email.provider == "console"

    read = await client.post(
        f"/api/v1/me/notifications/{inbox['items'][0]['id']}/read", headers={CSRF: csrf}
    )
    assert read.status_code == 204
    assert (await client.get("/api/v1/me/notifications")).json()["unread"] == 0


async def test_session_reminder_follows_opt_in(client, seeded_admin):
    await verified_provider(client, seeded_admin, "organiser@test.local")
    csrf = await login(client, "organiser@test.local")
    starts = datetime.now(UTC) + timedelta(hours=10)
    session = await client.post(
        "/api/v1/application-support-sessions",
        headers={CSRF: csrf},
        json={
            "topic": "CV help desk",
            "description": "Bring your CV for feedback from volunteers.",
            "starts_at": starts.isoformat(),
            "ends_at": (starts + timedelta(hours=2)).isoformat(),
            "location": "Awgu Town Hall",
            "capacity": 10,
            "organizer_contact": "desk@test.local",
        },
    )
    session_id = session.json()["id"]
    admin_csrf = await login(client, seeded_admin)
    await client.post(
        f"/api/v1/admin/moderation/sessions/{session_id}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )

    wants = await adult(client, "wants@test.local")
    await client.post(
        f"/api/v1/application-support-sessions/{session_id}/registrations",
        headers={CSRF: wants},
        json={"reminder_opt_in": True},
    )
    declines = await adult(client, "declines@test.local")
    await client.post(
        f"/api/v1/application-support-sessions/{session_id}/registrations",
        headers={CSRF: declines},
        json={"reminder_opt_in": False},
    )

    admin_csrf = await login(client, seeded_admin)
    result = await client.post(
        "/api/v1/admin/jobs/reminders", headers={CSRF: admin_csrf}
    )
    assert result.json()["session_reminders"] == 1


async def test_only_staff_can_run_reminders(client):
    csrf = await adult(client, "nobody@test.local")
    response = await client.post("/api/v1/admin/jobs/reminders", headers={CSRF: csrf})
    assert response.status_code == 403


def test_destinations_are_masked_in_logs():
    assert mask_destination("ngozi@example.com") == "n***@example.com"
    assert mask_destination("08031234567") == "*******4567"
