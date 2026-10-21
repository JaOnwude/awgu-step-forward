"""Scheduled jobs over HTTP, for an external scheduler (DECISIONS D27).

The demo runs on free hosting with no background worker, so a GitHub Actions
schedule calls this endpoint hourly (`.github/workflows/scheduled-jobs.yml`).
It is protected by a shared secret, `JOBS_TOKEN`, sent as a bearer token;
with no token configured the endpoint is switched off. Running it twice is
safe: expired listings are only expired once and reminders are deduplicated.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import NotFoundError, PermissionDeniedError
from app.core.security import hash_token, safe_equals
from app.db.session import get_db
from app.features.audit.service import record_event
from app.features.opportunities.service import expire_overdue_listings
from app.jobs.reminders import run_reminders

router = APIRouter(prefix="/internal/jobs", tags=["jobs"])


class ScheduledRunResult(BaseModel):
    expired_listings: int
    deadline_reminders: int
    session_reminders: int


def _require_job_token(request: Request) -> None:
    expected = get_settings().jobs_token
    if not expected:
        # Not configured: behave as if the endpoint doesn't exist.
        raise NotFoundError()
    header = request.headers.get("Authorization", "")
    provided = header.removeprefix("Bearer ").strip()
    # Compare hashes in constant time so the token can't be guessed by timing.
    if not provided or not safe_equals(hash_token(provided), hash_token(expected)):
        raise PermissionDeniedError("Invalid job token.", code="invalid_job_token")


@router.post("/run", response_model=ScheduledRunResult)
async def run_scheduled_jobs(
    request: Request, db: AsyncSession = Depends(get_db)
) -> ScheduledRunResult:
    _require_job_token(request)
    expired = await expire_overdue_listings(db)
    deadline, session = await run_reminders(db)
    result = ScheduledRunResult(
        expired_listings=expired,
        deadline_reminders=deadline,
        session_reminders=session,
    )
    await record_event(
        db,
        action="job.scheduled_run",
        metadata=result.model_dump(),
    )
    await db.commit()
    return result
