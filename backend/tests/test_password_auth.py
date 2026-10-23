"""Signing up and in with an email and password (synthetic data only)."""

from __future__ import annotations

import pytest

from app.features.identity.service import PASSWORD_MAX_FAILURES
from tests.helpers import CSRF, login

PASSWORD = "awgu-test-pass-1"


async def sign_up(client, email: str, password: str = PASSWORD):
    return await client.post(
        "/api/v1/auth/password/sign-up", json={"email": email, "password": password}
    )


async def sign_in(client, email: str, password: str = PASSWORD):
    return await client.post(
        "/api/v1/auth/password/sign-in", json={"email": email, "password": password}
    )


@pytest.mark.asyncio
async def test_sign_up_then_sign_in_with_password(client):
    created = await sign_up(client, "New.Person@test.local")
    assert created.status_code == 201, created.text
    user = created.json()["user"]
    assert user["email"] == "new.person@test.local"
    assert user["has_password"] is True
    assert user["email_verified"] is False
    assert "applicant" in user["roles"]

    client.cookies.clear()
    signed_in = await sign_in(client, "new.person@test.local")
    assert signed_in.status_code == 200, signed_in.text
    assert (await client.get("/api/v1/auth/me")).status_code == 200


@pytest.mark.asyncio
async def test_sign_up_rejects_weak_password_and_existing_account(client):
    short = await sign_up(client, "short@test.local", "abc")
    assert short.status_code == 422
    assert short.json()["error"]["code"] == "weak_password"

    same_as_email = await sign_up(client, "same@test.local", "same@test.local")
    assert same_as_email.status_code == 422

    # An account made with a code must not get a stranger's password.
    await login(client, "existing@test.local")
    client.cookies.clear()
    taken = await sign_up(client, "existing@test.local")
    assert taken.status_code == 409
    assert taken.json()["error"]["code"] == "account_exists"


@pytest.mark.asyncio
async def test_wrong_password_unknown_email_and_code_only_look_the_same(client):
    await sign_up(client, "person@test.local")
    await login(client, "codeonly@test.local")
    client.cookies.clear()

    answers = [
        await sign_in(client, "person@test.local", "wrong-password"),
        await sign_in(client, "nobody@test.local"),
        await sign_in(client, "codeonly@test.local"),
    ]
    assert {response.status_code for response in answers} == {422}
    assert len({response.json()["error"]["message"] for response in answers}) == 1


@pytest.mark.asyncio
async def test_too_many_wrong_passwords_locks_password_sign_in(client):
    await sign_up(client, "locked@test.local")
    client.cookies.clear()
    for _ in range(PASSWORD_MAX_FAILURES):
        wrong = await sign_in(client, "locked@test.local", "nope-nope")
        assert wrong.status_code == 422

    # Even the right password waits until the lock ends.
    locked = await sign_in(client, "locked@test.local")
    assert locked.status_code == 429
    assert locked.json()["error"]["code"] == "password_locked"


@pytest.mark.asyncio
async def test_code_only_account_can_add_a_password(client):
    csrf = await login(client, "adder@test.local")
    added = await client.put(
        "/api/v1/auth/password", headers={CSRF: csrf}, json={"new_password": PASSWORD}
    )
    assert added.status_code == 200, added.text
    assert added.json()["has_password"] is True

    client.cookies.clear()
    assert (await sign_in(client, "adder@test.local")).status_code == 200


@pytest.mark.asyncio
async def test_changing_a_password_needs_the_current_one(client):
    created = await sign_up(client, "changer@test.local")
    csrf = created.json()["csrf_token"]

    refused = await client.put(
        "/api/v1/auth/password",
        headers={CSRF: csrf},
        json={"new_password": "brand-new-pass", "current_password": "not-it"},
    )
    assert refused.status_code == 422

    changed = await client.put(
        "/api/v1/auth/password",
        headers={CSRF: csrf},
        json={"new_password": "brand-new-pass", "current_password": PASSWORD},
    )
    assert changed.status_code == 200, changed.text

    client.cookies.clear()
    assert (await sign_in(client, "changer@test.local")).status_code == 422
    new = await sign_in(client, "changer@test.local", "brand-new-pass")
    assert new.status_code == 200


@pytest.mark.asyncio
async def test_setting_a_password_needs_csrf(client):
    await sign_up(client, "csrf@test.local")
    response = await client.put(
        "/api/v1/auth/password", json={"new_password": PASSWORD}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_owner_proving_email_by_code_drops_a_strangers_password(client):
    # Someone signs up with an address that isn't theirs...
    squatter = await sign_up(client, "owner@test.local")
    assert squatter.status_code == 201

    # ...then the real owner signs in with an emailed code.
    client.cookies.clear()
    requested = await client.post(
        "/api/v1/auth/otp/request",
        json={"channel": "email", "destination": "owner@test.local"},
    )
    assert requested.status_code == 200, requested.text
    code = requested.json()["dev_code"]
    verified = await client.post(
        "/api/v1/auth/otp/verify",
        json={"channel": "email", "destination": "owner@test.local", "code": code},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["user"]["email_verified"] is True
    assert verified.json()["user"]["has_password"] is False

    # The stranger's password no longer works.
    client.cookies.clear()
    assert (await sign_in(client, "owner@test.local")).status_code == 422
