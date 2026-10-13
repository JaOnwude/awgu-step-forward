from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

CSRF = "X-CSRF-Token"


def _adult_dob() -> date:
    today = date.today()
    return date(today.year - 22, 1, 1)


def _minor_dob() -> date:
    today = date.today()
    return date(today.year - 15, 1, 1)


def _profile_payload(dob: date, **overrides) -> dict:
    payload = {
        "preferred_name": "Ada Nwosu",
        "date_of_birth": dob.isoformat(),
        "lga": "Awgu",
        "community": "Awgu Town",
        "education_level": "secondary",
    }
    payload.update(overrides)
    return payload


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
        "application_route": "platform",
        "deadline_at": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
    }
    payload.update(overrides)
    return payload


async def _dev_login(client, email: str) -> str:
    response = await client.post("/api/v1/auth/dev-login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()["csrf_token"]


async def _otp_login(client, email: str) -> str:
    request = await client.post(
        "/api/v1/auth/otp/request",
        json={"channel": "email", "destination": email},
    )
    assert request.status_code == 200, request.text
    code = request.json()["dev_code"]
    assert code, "dev_code should be returned while dev auth is enabled"
    verify = await client.post(
        "/api/v1/auth/otp/verify",
        json={"channel": "email", "destination": email, "code": code},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()["csrf_token"]


async def _publish_listing(
    client,
    *,
    admin_email: str,
    provider_email: str = "owner@test.local",
    payload: dict | None = None,
) -> dict:
    provider_csrf = await _dev_login(client, provider_email)
    org = await client.post(
        "/api/v1/providers",
        headers={CSRF: provider_csrf},
        json=_provider_payload(f"Provider {provider_email}"),
    )
    assert org.status_code == 201, org.text
    org_id = org.json()["id"]

    admin_csrf = await _dev_login(client, admin_email)
    verdict = await client.post(
        f"/api/v1/admin/moderation/providers/{org_id}/verification",
        headers={CSRF: admin_csrf},
        json={"decision": "approve", "rationale": "Registration confirmed."},
    )
    assert verdict.status_code == 200, verdict.text

    provider_csrf = await _dev_login(client, provider_email)
    listing = await client.post(
        "/api/v1/opportunities",
        headers={CSRF: provider_csrf},
        json=payload or _listing_payload(),
    )
    assert listing.status_code == 201, listing.text
    opp = listing.json()

    submitted = await client.post(
        f"/api/v1/opportunities/{opp['id']}/submit", headers={CSRF: provider_csrf}
    )
    assert submitted.status_code == 200, submitted.text

    admin_csrf = await _dev_login(client, admin_email)
    decision = await client.post(
        f"/api/v1/admin/moderation/listings/{opp['id']}/decision",
        headers={CSRF: admin_csrf},
        json={"decision": "approve"},
    )
    assert decision.status_code == 200, decision.text
    return decision.json()


async def _set_adult_profile(client, csrf: str) -> dict:
    response = await client.put(
        "/api/v1/me/profile",
        headers={CSRF: csrf},
        json=_profile_payload(_adult_dob()),
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
async def test_otp_login_creates_applicant_and_resend_is_throttled(client):
    request = await client.post(
        "/api/v1/auth/otp/request",
        json={"channel": "email", "destination": "Newcomer@Test.local"},
    )
    assert request.status_code == 200, request.text
    body = request.json()
    assert body["destination"] == "newcomer@test.local"

    again = await client.post(
        "/api/v1/auth/otp/request",
        json={"channel": "email", "destination": "newcomer@test.local"},
    )
    assert again.status_code == 429

    verify = await client.post(
        "/api/v1/auth/otp/verify",
        json={
            "channel": "email",
            "destination": "newcomer@test.local",
            "code": body["dev_code"],
        },
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["user"]["roles"] == ["applicant"]

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "newcomer@test.local"


@pytest.mark.asyncio
async def test_wrong_otp_code_is_rejected(client):
    requested = await client.post(
        "/api/v1/auth/otp/request",
        json={"channel": "email", "destination": "wrong@test.local"},
    )
    code = requested.json()["dev_code"]
    bad = "000000" if code != "000000" else "111111"

    verify = await client.post(
        "/api/v1/auth/otp/verify",
        json={"channel": "email", "destination": "wrong@test.local", "code": bad},
    )
    assert verify.status_code == 422


@pytest.mark.asyncio
async def test_minor_profile_is_blocked(client):
    csrf = await _otp_login(client, "minor@test.local")
    response = await client.put(
        "/api/v1/me/profile",
        headers={CSRF: csrf},
        json=_profile_payload(_minor_dob()),
    )
    assert response.status_code == 403
    assert (await client.get("/api/v1/me/profile")).status_code == 404


@pytest.mark.asyncio
async def test_profile_requires_auth(client):
    assert (await client.get("/api/v1/me/profile")).status_code == 401


@pytest.mark.asyncio
async def test_adult_profile_upsert_and_read(client):
    csrf = await _otp_login(client, "adult@test.local")
    created = await _set_adult_profile(client, csrf)
    assert created["age_band"] == "18_24"
    assert created["is_minor"] is False

    updated = await client.put(
        "/api/v1/me/profile",
        headers={CSRF: csrf},
        json=_profile_payload(_adult_dob(), preferred_name="Ada Updated"),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["preferred_name"] == "Ada Updated"

    fetched = await client.get("/api/v1/me/profile")
    assert fetched.status_code == 200
    assert fetched.json()["preferred_name"] == "Ada Updated"


@pytest.mark.asyncio
async def test_save_list_and_unsave_listing(client, seeded_admin):
    listing = await _publish_listing(client, admin_email=seeded_admin)
    csrf = await _otp_login(client, "saver@test.local")

    saved = await client.post(
        "/api/v1/me/saved",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["title"] == listing["title"]

    # Saving again is idempotent.
    repeat = await client.post(
        "/api/v1/me/saved",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert repeat.status_code == 201
    assert repeat.json()["id"] == saved.json()["id"]

    listed = await client.get("/api/v1/me/saved")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    removed = await client.delete(
        f"/api/v1/me/saved/{listing['id']}", headers={CSRF: csrf}
    )
    assert removed.status_code == 204
    assert (await client.get("/api/v1/me/saved")).json() == []


@pytest.mark.asyncio
async def test_save_unknown_listing_returns_404(client):
    csrf = await _otp_login(client, "ghostsaver@test.local")
    response = await client.post(
        "/api/v1/me/saved",
        headers={CSRF: csrf},
        json={"opportunity_id": str(uuid.uuid4())},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_application_requires_adult_profile(client, seeded_admin):
    listing = await _publish_listing(client, admin_email=seeded_admin)
    csrf = await _otp_login(client, "noprofile@test.local")
    response = await client.post(
        "/api/v1/applications",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_apply_rejected_for_external_route(client, seeded_admin):
    listing = await _publish_listing(
        client,
        admin_email=seeded_admin,
        payload=_listing_payload(
            application_route="external", external_url="https://example.test/apply"
        ),
    )
    csrf = await _otp_login(client, "external@test.local")
    await _set_adult_profile(client, csrf)
    response = await client.post(
        "/api/v1/applications",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_apply_rejected_below_min_age(client, seeded_admin):
    listing = await _publish_listing(
        client,
        admin_email=seeded_admin,
        payload=_listing_payload(min_age=25),
    )
    csrf = await _otp_login(client, "toooyoung@test.local")
    await _set_adult_profile(client, csrf)
    response = await client.post(
        "/api/v1/applications",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_application_full_flow_with_idempotent_submit(client, seeded_admin):
    listing = await _publish_listing(client, admin_email=seeded_admin)
    csrf = await _otp_login(client, "applicant@test.local")
    await _set_adult_profile(client, csrf)

    form = await client.get(f"/api/v1/applications/form/{listing['id']}")
    assert form.status_code == 200, form.text
    keys = {q["key"] for q in form.json()["questions"]}
    assert "why_interested" in keys

    created = await client.post(
        "/api/v1/applications",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert created.status_code == 201, created.text
    application = created.json()
    app_id = application["id"]
    assert application["status"] == "draft"
    assert application["reference"].startswith("ASF-")

    # Re-requesting the same listing returns the same draft.
    resume = await client.post(
        "/api/v1/applications",
        headers={CSRF: csrf},
        json={"opportunity_id": listing["id"]},
    )
    assert resume.status_code == 201
    assert resume.json()["id"] == app_id

    # Submitting without required answers is rejected.
    empty_submit = await client.post(
        f"/api/v1/applications/{app_id}/submit", headers={CSRF: csrf}
    )
    assert empty_submit.status_code == 422

    answers = {
        "answers": [
            {"question_key": "why_interested", "answer_value": "I want skills."},
            {"question_key": "availability", "answer_value": "Immediately"},
            {"question_key": "confirm_accuracy", "answer_value": "yes"},
        ]
    }
    patched = await client.patch(
        f"/api/v1/applications/{app_id}", headers={CSRF: csrf}, json=answers
    )
    assert patched.status_code == 200, patched.text

    submitted = await client.post(
        f"/api/v1/applications/{app_id}/submit",
        headers={CSRF: csrf, "Idempotency-Key": "submit-1"},
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "submitted"

    # Retrying with the same key is idempotent.
    retry = await client.post(
        f"/api/v1/applications/{app_id}/submit",
        headers={CSRF: csrf, "Idempotency-Key": "submit-1"},
    )
    assert retry.status_code == 200
    assert retry.json()["reference"] == submitted.json()["reference"]

    # Retrying with a different key conflicts.
    conflict = await client.post(
        f"/api/v1/applications/{app_id}/submit",
        headers={CSRF: csrf, "Idempotency-Key": "submit-2"},
    )
    assert conflict.status_code == 409

    detail = await client.get(f"/api/v1/applications/{app_id}")
    assert detail.status_code == 200, detail.text
    history = detail.json()["history"]
    assert [event["to_status"] for event in history] == ["draft", "submitted"]

    listing_apps = await client.get("/api/v1/applications")
    assert listing_apps.status_code == 200
    assert len(listing_apps.json()) == 1

    withdrawn = await client.post(
        f"/api/v1/applications/{app_id}/withdraw",
        headers={CSRF: csrf},
        json={"note": "Accepted elsewhere."},
    )
    assert withdrawn.status_code == 200, withdrawn.text
    assert withdrawn.json()["status"] == "withdrawn"


@pytest.mark.asyncio
async def test_application_is_private_to_owner(client, seeded_admin):
    listing = await _publish_listing(client, admin_email=seeded_admin)

    owner_csrf = await _otp_login(client, "ownera@test.local")
    await _set_adult_profile(client, owner_csrf)
    created = await client.post(
        "/api/v1/applications",
        headers={CSRF: owner_csrf},
        json={"opportunity_id": listing["id"]},
    )
    app_id = created.json()["id"]

    client.cookies.clear()
    await _otp_login(client, "intruder@test.local")
    assert (await client.get(f"/api/v1/applications/{app_id}")).status_code == 404
