from __future__ import annotations

import asyncio

from app.db.session import SessionLocal
from app.features.opportunities import service


async def run() -> int:
    async with SessionLocal() as db:
        expired = await service.expire_overdue_listings(db)
        print(f"Expired {expired} overdue listing(s).")
        return expired


if __name__ == "__main__":
    asyncio.run(run())
