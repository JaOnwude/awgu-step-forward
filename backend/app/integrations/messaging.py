"""Replaceable email and SMS adapters (spec R35, DECISIONS D3/D4, D26).

Email can be really delivered through Brevo or Resend over their HTTPS APIs
(`EMAIL_PROVIDER=brevo|resend`). HTTPS, not SMTP, because Render's free
plan blocks outgoing SMTP ports. `console` (the default) only writes to the
server log. SMS stays console-only until a Termii account, sender ID and
funding exist. Recipients are masked in logs and API keys are never logged.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import get_settings

logger = logging.getLogger("awgu.messaging")


@dataclass(frozen=True)
class OutgoingMessage:
    to: str
    subject: str
    body: str
    # Optional HTML version for email; `body` is always the plain-text part.
    html: str | None = None


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


class _HttpEmailAdapter:
    """Shared HTTPS sending for the hosted email APIs."""

    channel = "email"
    provider = "http"
    url = ""
    timeout_seconds = 10.0
    # Tests swap in httpx.MockTransport; None means real network calls.
    transport: httpx.AsyncBaseTransport | None = None

    def __init__(self, api_key: str, from_address: str, from_name: str) -> None:
        if not api_key or not from_address:
            raise AdapterNotConfiguredError(
                f"Set EMAIL_API_KEY and EMAIL_FROM_ADDRESS to use {self.provider}."
            )
        self.api_key = api_key
        self.from_address = from_address
        self.from_name = from_name

    def _request(self, message: OutgoingMessage) -> tuple[dict, dict]:
        raise NotImplementedError

    async def send(self, message: OutgoingMessage) -> DeliveryResult:
        headers, payload = self._request(message)
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds, transport=self.transport
            ) as client:
                response = await client.post(self.url, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            logger.warning(
                "EMAIL via %s failed to=%s error=%s",
                self.provider,
                mask_destination(message.to),
                type(exc).__name__,
            )
            return DeliveryResult(ok=False, provider=self.provider, error="network")
        if response.status_code >= 300:
            # The provider's message explains rejected senders or bad keys.
            logger.warning(
                "EMAIL via %s rejected to=%s status=%s body=%s",
                self.provider,
                mask_destination(message.to),
                response.status_code,
                response.text[:300],
            )
            return DeliveryResult(
                ok=False, provider=self.provider, error=f"http_{response.status_code}"
            )
        logger.info(
            "EMAIL via %s sent to=%s subject=%r",
            self.provider,
            mask_destination(message.to),
            message.subject,
        )
        return DeliveryResult(ok=True, provider=self.provider)


class BrevoEmailAdapter(_HttpEmailAdapter):
    """Brevo transactional email API (free plan: 300 emails a day)."""

    provider = "brevo"
    url = "https://api.brevo.com/v3/smtp/email"

    def _request(self, message: OutgoingMessage) -> tuple[dict, dict]:
        payload = {
            "sender": {"name": self.from_name, "email": self.from_address},
            "to": [{"email": message.to}],
            "subject": message.subject,
            "textContent": message.body,
        }
        if message.html:
            payload["htmlContent"] = message.html
        headers = {"api-key": self.api_key, "accept": "application/json"}
        return headers, payload


class ResendEmailAdapter(_HttpEmailAdapter):
    """Resend email API. Needs a verified domain to email anyone but yourself."""

    provider = "resend"
    url = "https://api.resend.com/emails"

    def _request(self, message: OutgoingMessage) -> tuple[dict, dict]:
        payload = {
            "from": f"{self.from_name} <{self.from_address}>",
            "to": [message.to],
            "subject": message.subject,
            "text": message.body,
        }
        if message.html:
            payload["html"] = message.html
        headers = {"Authorization": f"Bearer {self.api_key}"}
        return headers, payload


def email_delivers() -> bool:
    """True when emails really reach people (not just the server log)."""
    return get_settings().email_provider != "console"


def sms_delivers() -> bool:
    return get_settings().sms_provider != "console"


def get_email_adapter() -> MessageAdapter:
    settings = get_settings()
    provider = settings.email_provider
    if provider == "console":
        return ConsoleEmailAdapter()
    adapters = {"brevo": BrevoEmailAdapter, "resend": ResendEmailAdapter}
    if provider in adapters:
        return adapters[provider](
            settings.email_api_key,
            settings.email_from_address,
            settings.email_from_name,
        )
    raise AdapterNotConfiguredError(f"Email provider {provider!r} is not configured.")


def get_sms_adapter() -> MessageAdapter:
    provider = get_settings().sms_provider
    if provider == "console":
        return ConsoleSmsAdapter()
    raise AdapterNotConfiguredError(f"SMS provider {provider!r} is not configured.")
