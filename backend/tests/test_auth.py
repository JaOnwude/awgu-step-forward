from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dev_login_admin_then_me(client, seeded_admin):
    login = await client.post(
        "/api/v1/auth/dev-login", json={"email": seeded_admin}
    )
    assert login.status_code == 200
    body = login.json()
    assert "admin" in body["user"]["roles"]
    assert body["csrf_token"]

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == seeded_admin


@pytest.mark.asyncio
async def test_admin_ping_allows_admin(client, seeded_admin):
    await client.post("/api/v1/auth/dev-login", json={"email": seeded_admin})
    response = await client.get("/api/v1/admin/ping")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_admin_ping_denies_plain_applicant(client):
    login = await client.post(
        "/api/v1/auth/dev-login", json={"email": "random@test.local"}
    )
    assert login.status_code == 200
    assert "admin" not in login.json()["user"]["roles"]

    response = await client.get("/api/v1/admin/ping")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_logout_requires_csrf_then_succeeds(client, seeded_admin):
    login = await client.post(
        "/api/v1/auth/dev-login", json={"email": seeded_admin}
    )
    csrf = login.json()["csrf_token"]

    no_header = await client.post("/api/v1/auth/logout")
    assert no_header.status_code == 403

    with_header = await client.post(
        "/api/v1/auth/logout", headers={"X-CSRF-Token": csrf}
    )
    assert with_header.status_code == 200
