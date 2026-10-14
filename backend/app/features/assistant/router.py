from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.features.assistant import service
from app.features.assistant.schemas import (
    AssistantQuery,
    AssistantResult,
    AssistantStatus,
)

router = APIRouter(prefix="/opportunity-assistant", tags=["assistant"])


@router.get("/status", response_model=AssistantStatus)
async def assistant_status() -> AssistantStatus:
    return service.status()


@router.post("/search", response_model=AssistantResult)
async def assistant_search(
    payload: AssistantQuery,
    db: AsyncSession = Depends(get_db),
) -> AssistantResult:
    # Public and account-free: no applicant data is read or sent (spec R48).
    return await service.search(db, query=payload.query)
