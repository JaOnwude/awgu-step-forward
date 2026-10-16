"""Profile pictures: upload, view and remove your own.

Uploads are re-encoded on the server: only JPEG, PNG and WebP are accepted,
the picture is rotated upright, cropped to a centred square, resized and
saved as WebP. Re-encoding also drops all metadata, including any GPS
location a phone camera may have embedded (spec privacy rules).
Pictures are private: only the signed-in owner can fetch theirs.
"""

from __future__ import annotations

import io

from fastapi import APIRouter, Depends, File, Response, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_context, verify_csrf
from app.core.config import get_settings
from app.core.errors import NotFoundError, ValidationError
from app.db.session import get_db
from app.features.audit.service import record_event
from app.features.identity.models import UserAvatar, utcnow
from app.features.identity.schemas import UserPublic
from app.features.identity.service import serialize_user

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
# Refuse images that would decode to a huge bitmap ("decompression bombs").
Image.MAX_IMAGE_PIXELS = 40_000_000

router = APIRouter(prefix="/me/avatar", tags=["profile picture"])


def process_avatar(raw: bytes, size: int) -> bytes:
    """Validate an uploaded image and return a square WebP of `size` pixels."""
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            fmt = probe.format
            probe.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("That file isn't a picture we can read.") from exc
    if fmt not in ALLOWED_FORMATS:
        raise ValidationError("Use a JPEG, PNG or WebP picture.")

    # verify() leaves the image unusable, so open it again to process it.
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
        square = ImageOps.fit(image, (size, size), method=Image.Resampling.LANCZOS)
        out = io.BytesIO()
        square.save(out, format="WEBP", quality=82, method=6)
    return out.getvalue()


@router.put("", response_model=UserPublic)
async def upload_avatar(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    settings = get_settings()
    # Read one byte past the limit so oversized uploads are refused cheaply.
    raw = await file.read(settings.avatar_max_upload_bytes + 1)
    if not raw:
        raise ValidationError("Choose a picture to upload.")
    if len(raw) > settings.avatar_max_upload_bytes:
        limit_mb = settings.avatar_max_upload_bytes // (1024 * 1024)
        raise ValidationError(f"Pictures must be {limit_mb} MB or smaller.")

    content = process_avatar(raw, settings.avatar_size_px)
    avatar = await db.get(UserAvatar, ctx.user.id)
    if avatar is None:
        db.add(
            UserAvatar(user_id=ctx.user.id, content=content, content_type="image/webp")
        )
    else:
        avatar.content = content
        avatar.content_type = "image/webp"
        avatar.updated_at = utcnow()
    ctx.user.avatar_updated_at = utcnow()
    await record_event(
        db,
        action="profile.avatar_updated",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=ctx.user.id,
    )
    await db.commit()
    await db.refresh(ctx.user)
    return serialize_user(ctx.user)


@router.get("")
async def get_avatar(
    ctx: AuthContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
) -> Response:
    avatar = await db.get(UserAvatar, ctx.user.id)
    if avatar is None:
        raise NotFoundError("No profile picture yet.")
    return Response(
        content=avatar.content,
        media_type=avatar.content_type,
        # Private to this browser; the ?v= version in the URL busts the cache.
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.delete("", response_model=UserPublic)
async def delete_avatar(
    ctx: AuthContext = Depends(verify_csrf),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    avatar = await db.get(UserAvatar, ctx.user.id)
    if avatar is not None:
        await db.delete(avatar)
    ctx.user.avatar_updated_at = None
    await record_event(
        db,
        action="profile.avatar_removed",
        actor_user_id=ctx.user.id,
        target_type="user",
        target_id=ctx.user.id,
    )
    await db.commit()
    await db.refresh(ctx.user)
    return serialize_user(ctx.user)
