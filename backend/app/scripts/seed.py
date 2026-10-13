from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from app.db.session import SessionLocal
from app.features.identity import repository as repo

ADMIN_EMAIL = "admin@awgu.local"
APPLICANT_EMAIL = "applicant@awgu.local"


async def seed() -> None:
    async with SessionLocal() as db:
        admin = await repo.get_user_by_email(db, ADMIN_EMAIL)
        if admin is None:
            admin = await repo.create_user(
                db,
                email=ADMIN_EMAIL,
                email_verified_at=datetime.now(UTC),
            )
        await repo.ensure_role(db, admin.id, "admin")

        applicant = await repo.get_user_by_email(db, APPLICANT_EMAIL)
        if applicant is None:
            applicant = await repo.create_user(
                db,
                email=APPLICANT_EMAIL,
                email_verified_at=datetime.now(UTC),
            )
        await repo.ensure_role(db, applicant.id, "applicant")

        await db.commit()
        print(f"Seeded admin={ADMIN_EMAIL} applicant={APPLICANT_EMAIL}")


if __name__ == "__main__":
    asyncio.run(seed())
