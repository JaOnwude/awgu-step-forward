"""Profile pictures: upload, view, replace and remove your own."""

from __future__ import annotations

import io

from PIL import Image

from tests.helpers import CSRF, login

AVATAR = "/api/v1/me/avatar"


def _picture(fmt: str = "PNG", size: tuple[int, int] = (640, 480), exif=None) -> bytes:
    image = Image.new("RGB", size, (15, 90, 67))
    out = io.BytesIO()
    if exif is not None:
        image.save(out, format=fmt, exif=exif)
    else:
        image.save(out, format=fmt)
    return out.getvalue()


async def _upload(client, csrf, data: bytes, name="me.png", mime="image/png"):
    return await client.put(
        AVATAR, headers={CSRF: csrf}, files={"file": (name, data, mime)}
    )


async def test_upload_view_and_remove_avatar(client):
    csrf = await login(client, "avatar@test.local")
    assert (await client.get(AVATAR)).status_code == 404

    uploaded = await _upload(client, csrf, _picture())
    assert uploaded.status_code == 200, uploaded.text
    url = uploaded.json()["avatar_url"]
    assert url.startswith("/api/v1/me/avatar?v=")

    # Stored as a small square WebP, whatever was uploaded.
    fetched = await client.get(AVATAR)
    assert fetched.status_code == 200
    assert fetched.headers["content-type"] == "image/webp"
    with Image.open(io.BytesIO(fetched.content)) as stored:
        assert stored.format == "WEBP"
        assert stored.size == (256, 256)

    me = (await client.get("/api/v1/auth/me")).json()
    assert me["avatar_url"] == url

    removed = await client.request("DELETE", AVATAR, headers={CSRF: csrf})
    assert removed.status_code == 200
    assert removed.json()["avatar_url"] is None
    assert (await client.get(AVATAR)).status_code == 404


async def test_location_metadata_is_stripped(client):
    csrf = await login(client, "gps@test.local")
    exif = Image.Exif()
    exif[0x8825] = {2: (6.0, 31.0, 0.0)}  # GPSInfo with a latitude
    exif[0x010F] = "PhoneMaker"
    jpeg = _picture("JPEG", exif=exif.tobytes())
    assert (
        await _upload(client, csrf, jpeg, "me.jpg", "image/jpeg")
    ).status_code == 200
    stored = (await client.get(AVATAR)).content
    with Image.open(io.BytesIO(stored)) as image:
        assert not image.getexif()


async def test_rejects_non_images_and_unsupported_formats(client):
    csrf = await login(client, "bad@test.local")
    text = await _upload(client, csrf, b"not a picture", "notes.txt", "text/plain")
    assert text.status_code == 422
    gif = await _upload(client, csrf, _picture("GIF"), "me.gif", "image/gif")
    assert gif.status_code == 422
    assert "JPEG, PNG or WebP" in gif.json()["error"]["message"]


async def test_rejects_oversized_upload(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "avatar_max_upload_bytes", 1000)
    csrf = await login(client, "big@test.local")
    response = await _upload(client, csrf, _picture(size=(800, 800)))
    assert response.status_code == 422
    assert "MB or smaller" in response.json()["error"]["message"]


async def test_avatar_requires_sign_in_and_csrf(client):
    assert (await client.get(AVATAR)).status_code == 401
    await login(client, "nocsrf@test.local")
    response = await client.put(
        AVATAR, files={"file": ("me.png", _picture(), "image/png")}
    )
    assert response.status_code == 403
