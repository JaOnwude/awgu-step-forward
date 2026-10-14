from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from app.features.audit.models import AuditEvent

CSRF = "X-CSRF-Token"
BASE = "/api/v1/application-support-sessions"

PROVIDER_PAYLOAD = {
    "name": "Awgu Youth Desk",
    "provider_type": "ngo",
    "public_contact": "desk@awguyouth.test",
    "operating_area": "Awgu LGA",
}


def _session_payload(**overrides) -> dict:
    starts = datetime.now(UTC) + timedelta(days=7)
    payload = {
        "topic": "Scholarship essay clinic",
        "description": "Bring your draft essay and get one-to-one feedback.",
        "starts_at": starts.isoformat(),
        "ends_at": (starts + timedelta(hours=2)).isoformat(),
        "delivery_mode": "onsite",
        "location": "Awgu Town Hall",
        "capacity": 20,
        "accessibility_notes": "Ground floor, step-free entrance.",
        "organizer_contact": "desk@awguyouth.test",
    }
    payload.update(overrides)
    return payload


async def _login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def _provider(client, admin_email: str, *, email: str, verify: bool = True):
    csrf = await _login(client, email)
    org = await client.post(
        "/api/v1/providers",
        headers={CSRF: csrf},
        json={**PROVIDER_PAYLOAD, "name": f"Desk {email}"},
    )
    assert org.status_code == 201, org.text
    if verify:
        admin_csrf = await _login(client, admin_email)
        verdict = await client.post(
            f"/api/v1/admin/moderation/providers/{org.json()['id']}/verification",
            headers={CSRF: admin_csrf},
            json={"decision": "approve", "rationale": "Checked."},
        )
        assert verdict.status_code == 200, verdict.text
    return org.json()["id"]


async def _approved_session(client, admin_email: str, **overrides) -> dict:
    await _provider(client, admin_email, email="organizer@test.local")
    csrf = await _login(client, "organizer@test.local")
    created = await client.post(
        BASE, headers={CSRF: csrf}, json=_session_payload(**overrides)
    )
    assert created.status_code == 201, created.text
    admin_csrf = await _login(client, admin_email)
    decided = await client.post(
        f"/api/v1/admin/moderation/sessions/{created.json()['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert decided.status_code == 200, decided.text
    return decided.json()


async def _adult(client, email: str, name: str = "Ada Applicant") -> str:
    csrf = await _login(client, email)
    profile = await client.put(
        "/api/v1/me/profile",
        headers={CSRF: csrf},
        json={
            "preferred_name": name,
            "date_of_birth": date(date.today().year - 25, 1, 1).isoformat(),
            "lga": "Awgu",
            "education_level": "secondary",
        },
    )
    assert profile.status_code == 200, profile.text
    return csrf


async def test_unverified_provider_cannot_propose(client, seeded_admin):
    await _provider(client, seeded_admin, email="new@test.local", verify=False)
    csrf = await _login(client, "new@test.local")
    response = await client.post(BASE, headers={CSRF: csrf}, json=_session_payload())
    assert response.status_code == 403, response.text


async def test_session_dates_are_validated(client, seeded_admin):
    await _provider(client, seeded_admin, email="dates@test.local")
    csrf = await _login(client, "dates@test.local")
    past = datetime.now(UTC) - timedelta(days=1)
    response = await client.post(
        BASE,
        headers={CSRF: csrf},
        json=_session_payload(
            starts_at=past.isoformat(), ends_at=(past + timedelta(hours=1)).isoformat()
        ),
    )
    assert response.status_code == 422, response.text

    start = datetime.now(UTC) + timedelta(days=2)
    backwards = await client.post(
        BASE,
        headers={CSRF: csrf},
        json=_session_payload(
            starts_at=start.isoformat(),
            ends_at=(start - timedelta(hours=1)).isoformat(),
        ),
    )
    assert backwards.status_code == 422, backwards.text


async def test_session_stays_private_until_approved(client, seeded_admin):
    await _provider(client, seeded_admin, email="organizer@test.local")
    csrf = await _login(client, "organizer@test.local")
    created = await client.post(BASE, headers={CSRF: csrf}, json=_session_payload())
    assert created.status_code == 201, created.text
    session = created.json()
    assert session["status"] == "pending_review"

    await client.post("/api/v1/auth/logout", headers={CSRF: csrf})
    listing = await client.get(BASE)
    assert listing.json()["total"] == 0
    hidden = await client.get(f"{BASE}/{session['id']}")
    assert hidden.status_code == 401

    admin_csrf = await _login(client, seeded_admin)
    queue = await client.get("/api/v1/admin/moderation/queue")
    assert [s["id"] for s in queue.json()["sessions"]] == [session["id"]]
    approved = await client.post(
        f"/api/v1/admin/moderation/sessions/{session['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert approved.status_code == 200, approved.text

    public = await client.get(BASE)
    assert public.json()["total"] == 1
    item = public.json()["items"][0]
    assert item["seats_left"] == 20
    assert item["accessibility_notes"] == "Ground floor, step-free entrance."


async def test_reject_requires_reason_and_staff(client, seeded_admin):
    await _provider(client, seeded_admin, email="organizer@test.local")
    csrf = await _login(client, "organizer@test.local")
    created = await client.post(BASE, headers={CSRF: csrf}, json=_session_payload())
    session_id = created.json()["id"]

    as_provider = await client.post(
        f"/api/v1/admin/moderation/sessions/{session_id}/decision",
        headers={CSRF: csrf},
        json={"decision": "approve"},
    )
    assert as_provider.status_code == 403

    admin_csrf = await _login(client, seeded_admin)
    no_reason = await client.post(
        f"/api/v1/admin/moderation/sessions/{session_id}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "reject"},
    )
    assert no_reason.status_code == 422


async def test_registration_requires_adult_profile(client, seeded_admin):
    session = await _approved_session(client, seeded_admin)
    csrf = await _login(client, "noprofile@test.local")
    response = await client.post(
        f"{BASE}/{session['id']}/registrations", headers={CSRF: csrf}, json={}
    )
    assert response.status_code == 403, response.text


async def test_capacity_is_enforced_and_freed_by_cancel(client, seeded_admin):
    session = await _approved_session(client, seeded_admin, capacity=1)
    url = f"{BASE}/{session['id']}/registrations"

    first = await _adult(client, "first@test.local")
    registered = await client.post(
        url, headers={CSRF: first}, json={"reminder_opt_in": True}
    )
    assert registered.status_code == 201, registered.text
    again = await client.post(url, headers={CSRF: first}, json={})
    assert again.json()["id"] == registered.json()["id"]

    second = await _adult(client, "second@test.local")
    full = await client.post(url, headers={CSRF: second}, json={})
    assert full.status_code == 409, full.text

    detail = await client.get(f"{BASE}/{session['id']}")
    assert detail.json()["is_full"] is True

    first = await _login(client, "first@test.local")
    cancelled = await client.post(f"{url}/cancel", headers={CSRF: first})
    assert cancelled.json()["status"] == "cancelled"

    second = await _login(client, "second@test.local")
    now_free = await client.post(url, headers={CSRF: second}, json={})
    assert now_free.status_code == 201, now_free.text

    mine = await client.get("/api/v1/me/session-registrations")
    assert [r["session"]["id"] for r in mine.json()] == [session["id"]]


async def test_roster_is_minimal_and_scoped_to_organizer(
    client, seeded_admin, session_factory
):
    session = await _approved_session(client, seeded_admin)
    applicant = await _adult(client, "roster@test.local", name="Chidi")
    await client.post(
        f"{BASE}/{session['id']}/registrations", headers={CSRF: applicant}, json={}
    )

    # The applicant cannot see the roster.
    denied = await client.get(f"{BASE}/{session['id']}/roster")
    assert denied.status_code == 404

    # Another provider cannot see it either.
    await _provider(client, seeded_admin, email="other@test.local")
    await _login(client, "other@test.local")
    other = await client.get(f"{BASE}/{session['id']}/roster")
    assert other.status_code == 404

    organizer = await _login(client, "organizer@test.local")
    roster = await client.get(f"{BASE}/{session['id']}/roster")
    assert roster.status_code == 200, roster.text
    (entry,) = roster.json()["entries"]
    assert set(entry) == {
        "registration_id",
        "preferred_name",
        "status",
        "attendance",
        "registered_at",
    }
    assert entry["preferred_name"] == "Chidi"

    marked = await client.patch(
        f"{BASE}/{session['id']}/registrations/{entry['registration_id']}",
        headers={CSRF: organizer},
        json={"attendance": "attended"},
    )
    assert marked.json()["attendance"] == "attended"

    async with session_factory() as db:
        actions = set((await db.execute(select(AuditEvent.action))).scalars().all())
    assert {"session.roster_viewed", "session.attendance_recorded"} <= actions
