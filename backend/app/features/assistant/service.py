from __future__ import annotations

import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.features.assistant.interpreter import MODEL_NAME, interpret, redact
from app.features.assistant.models import AIUsageEvent
from app.features.assistant.schemas import (
    AssistantFilters,
    AssistantResult,
    AssistantStatus,
)
from app.features.opportunities import service as opportunity_service

DISCLAIMER = (
    "These are ordinary search results from verified listings. The assistant only "
    "picks filters — it does not decide who is eligible or rank applicants."
)


class AssistantDisabledError(AppError):
    status_code = 503
    code = "assistant_disabled"
    message = "The search assistant is switched off. Ordinary search works as usual."


def status() -> AssistantStatus:
    enabled = get_settings().ai_enabled
    return AssistantStatus(
        enabled=enabled,
        engine=MODEL_NAME,
        notice=(
            "Describe what you need in plain words. Don’t include your name, phone "
            "number or other personal details."
        ),
    )


async def search(db: AsyncSession, *, query: str) -> AssistantResult:
    if not get_settings().ai_enabled:
        raise AssistantDisabledError()

    started = time.perf_counter()
    cleaned, redacted = redact(query)
    plan = interpret(cleaned)

    def run(q: str | None):
        return opportunity_service.list_public_opportunities(
            db,
            q=q,
            category=plan.category,
            location=plan.location,
            delivery_mode=plan.delivery_mode,
            page=1,
            page_size=12,
        )

    listing = await run(plan.q)
    relaxed = False
    if listing.total == 0 and plan.q:
        # A stray keyword shouldn't hide everything; retry without it.
        listing = await run(None)
        relaxed = True
        plan.explanation.append(
            f"No listing mentioned “{plan.q}”, so that keyword was dropped."
        )
        plan.q = None

    if not plan.explanation:
        plan.explanation.append(
            "No filters recognised — showing all open opportunities."
        )

    db.add(
        AIUsageEvent(
            feature="opportunity_assistant",
            model=MODEL_NAME,
            filters=plan.filters(),
            listing_ids=[str(item.id) for item in listing.items],
            redacted=redacted,
            latency_ms=int((time.perf_counter() - started) * 1000),
            outcome="results" if listing.total else "no_results",
        )
    )
    await db.commit()

    return AssistantResult(
        filters=AssistantFilters(**plan.filters()),
        explanation=plan.explanation,
        redacted=redacted,
        relaxed=relaxed,
        items=listing.items,
        total=listing.total,
        engine=MODEL_NAME,
        disclaimer=DISCLAIMER,
    )
