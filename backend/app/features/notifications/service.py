from __future__ import annotations

import logging
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.features.identity.models import User, utcnow
from app.features.notifications.models import Notification, NotificationPreference
from app.features.notifications.schemas import (
    NotificationList,
    NotificationView,
    PreferencesUpdate,
    PreferencesView,
)
from app.integrations.messaging import (
    MessageAdapter,
    OutgoingMessage,
    get_email_adapter,
    get_sms_adapter,
)

logger = logging.getLogger("awgu.notifications")


async def get_or_default(
    db: AsyncSession, user_id: uuid.UUID
) -> NotificationPreference:
    prefs = await db.get(NotificationPreference, user_id)
    # Defaults: in-app only; reminders on; marketing off.
    return prefs or NotificationPreference(
        user_id=user_id,
        email_enabled=False,
        sms_enabled=False,
        deadline_reminders=True,
        session_reminders=True,
        marketing_opt_in=False,
    )


def _view(prefs: NotificationPreference, user: User) -> PreferencesView:
    return PreferencesView(
        email_enabled=prefs.email_enabled,
        sms_enabled=prefs.sms_enabled,
        deadline_reminders=prefs.deadline_reminders,
        session_reminders=prefs.session_reminders,
        marketing_opt_in=prefs.marketing_opt_in,
        email_available=bool(user.email and user.email_verified_at),
        sms_available=bool(user.phone and user.phone_verified_at),
    )


async def get_preferences(db: AsyncSession, *, user: User) -> PreferencesView:
    return _view(await get_or_default(db, user.id), user)


async def update_preferences(
    db: AsyncSession, *, user: User, payload: PreferencesUpdate
) -> PreferencesView:
    # A channel can only be chosen when the account has a verified address
    # for it (spec R35).
    if payload.email_enabled and not (user.email and user.email_verified_at):
        raise ValidationError(
            "Verify an email address before choosing email reminders."
        )
    if payload.sms_enabled and not (user.phone and user.phone_verified_at):
        raise ValidationError("Verify a phone number before choosing SMS reminders.")

    prefs = await db.get(NotificationPreference, user.id)
    if prefs is None:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
    prefs.email_enabled = payload.email_enabled
    prefs.sms_enabled = payload.sms_enabled
    prefs.deadline_reminders = payload.deadline_reminders
    prefs.session_reminders = payload.session_reminders
    prefs.marketing_opt_in = payload.marketing_opt_in
    await db.commit()
    await db.refresh(prefs)
    return _view(prefs, user)


async def list_in_app(
    db: AsyncSession, *, user: User, limit: int = 30
) -> NotificationList:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id, Notification.channel == "in_app")
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    unread = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.channel == "in_app",
            Notification.read_at.is_(None),
        )
    )
    return NotificationList(
        items=[NotificationView.model_validate(n) for n in result.scalars().all()],
        unread=int(unread or 0),
    )


async def mark_read(
    db: AsyncSession, *, user: User, notification_id: uuid.UUID
) -> None:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise NotFoundError("Notification not found.")
    if notification.read_at is None:
        notification.read_at = utcnow()
        await db.commit()


async def mark_all_read(db: AsyncSession, *, user: User) -> None:
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.channel == "in_app",
            Notification.read_at.is_(None),
        )
        .values(read_at=utcnow())
    )
    await db.commit()


async def _exists(db: AsyncSession, dedupe_key: str, channel: str) -> bool:
    found = await db.scalar(
        select(Notification.id).where(
            Notification.dedupe_key == dedupe_key, Notification.channel == channel
        )
    )
    return found is not None


async def _deliver(
    db: AsyncSession,
    *,
    user: User,
    channel: str,
    purpose: str,
    dedupe_key: str,
    subject: str,
    body: str,
    link: str | None,
    destination: str,
    adapter_factory,
) -> None:
    if await _exists(db, dedupe_key, channel):
        return
    row = Notification(
        user_id=user.id,
        channel=channel,
        purpose=purpose,
        dedupe_key=dedupe_key,
        subject=subject,
        body=body,
        link=link,
        status="pending",
    )
    db.add(row)
    # A failed delivery is recorded, never raised: reminders must not block
    # account or application flows (spec R36).
    try:
        adapter: MessageAdapter = adapter_factory()
        result = await adapter.send(
            OutgoingMessage(to=destination, subject=subject, body=body)
        )
        row.provider = result.provider
        row.status = "sent" if result.ok else "failed"
        row.error = result.error
        row.sent_at = utcnow() if result.ok else None
    except Exception as exc:  # noqa: BLE001 - recorded and swallowed on purpose
        logger.warning("Notification delivery failed on %s: %s", channel, exc)
        row.status = "failed"
        row.error = str(exc)[:300]


async def notify(
    db: AsyncSession,
    *,
    user: User,
    purpose: str,
    dedupe_key: str,
    subject: str,
    body: str,
    link: str | None = None,
) -> bool:
    """Send one message on every channel the user chose. The caller commits.

    Returns False when this message was already sent (deduplicated).
    """
    if await _exists(db, dedupe_key, "in_app"):
        return False
    prefs = await get_or_default(db, user.id)
    db.add(
        Notification(
            user_id=user.id,
            channel="in_app",
            purpose=purpose,
            dedupe_key=dedupe_key,
            subject=subject,
            body=body,
            link=link,
            status="sent",
            provider="in_app",
            sent_at=utcnow(),
        )
    )
    if prefs.email_enabled and user.email and user.email_verified_at:
        await _deliver(
            db,
            user=user,
            channel="email",
            purpose=purpose,
            dedupe_key=dedupe_key,
            subject=subject,
            body=body,
            link=link,
            destination=user.email,
            adapter_factory=get_email_adapter,
        )
    if prefs.sms_enabled and user.phone and user.phone_verified_at:
        await _deliver(
            db,
            user=user,
            channel="sms",
            purpose=purpose,
            dedupe_key=dedupe_key,
            subject=subject,
            body=body,
            link=link,
            destination=user.phone,
            adapter_factory=get_sms_adapter,
        )
    await db.flush()
    return True
