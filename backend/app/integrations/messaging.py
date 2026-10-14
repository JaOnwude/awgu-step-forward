"""Replaceable email and SMS adapters (spec R35, DECISIONS D3/D4).

Week 1 ships console adapters only: messages are written to the server log
and never delivered to a real person. Brevo (email) and Termii (SMS) plug in
here later behind the same interface, once accounts, sender approval and
funding exist. Recipients are masked in logs to keep PII out of them.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("awgu.messaging")


@dataclass(frozen=True)
class OutgoingMessage:
    to: str
    subject: str
    body: str


@dataclass(frozen=True)
class DeliveryResult:
    ok: bool
    provider: str
    error: str | None = None


class MessageAdapter(Protocol):
    channel: str

    async def send(self, message: OutgoingMessage) -> DeliveryResult: ...


class AdapterNotConfiguredError(RuntimeError):
    """Raised when settings name a provider that is not wired up yet."""


def mask_destination(value: str) -> str:
    """ngozi@example.com -> n***@example.com; 08031234567 -> ********4567."""
    if "@" in value:
        name, _, domain = value.partition("@")
        return f"{name[:1]}***@{domain}"
    return f"{'*' * max(len(value) - 4, 0)}{value[-4:]}"


class ConsoleEmailAdapter:
    channel = "email"

    async def send(self, message: OutgoingMessage) -> DeliveryResult:
        logger.info(
            "EMAIL (console, not delivered) to=%s subject=%r",
            mask_destination(message.to),
            message.subject,
        )
        return DeliveryResult(ok=True, provider="console")


class ConsoleSmsAdapter:
    channel = "sms"

    async def send(self, message: OutgoingMessage) -> DeliveryResult:
        logger.info(
            "SMS (console, not delivered) to=%s chars=%d",
            mask_destination(message.to),
            len(message.body),
        )
        return DeliveryResult(ok=True, provider="console")


def get_email_adapter() -> MessageAdapter:
    provider = get_settings().email_provider
    if provider == "console":
        return ConsoleEmailAdapter()
    raise AdapterNotConfiguredError(f"Email provider {provider!r} is not configured.")


def get_sms_adapter() -> MessageAdapter:
    provider = get_settings().sms_provider
    if provider == "console":
        return ConsoleSmsAdapter()
    raise AdapterNotConfiguredError(f"SMS provider {provider!r} is not configured.")
