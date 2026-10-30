from __future__ import annotations

import os
from datetime import UTC, datetime

# Tests must never send real email or SMS, whatever backend/.env says.
# Environment variables win over .env, and this runs before settings load.
os.environ["EMAIL_PROVIDER"] = "console"
os.environ["SMS_PROVIDER"] = "console"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.features.applicant.models  # noqa: F401
import app.features.applications.models  # noqa: F401
import app.features.assistant.models  # noqa: F401
import app.features.audit.models  # noqa: F401
import app.features.identity.models  # noqa: F401
import app.features.notifications.models  # noqa: F401
import app.features.opportunities.models  # noqa: F401
import app.features.providers.models  # noqa: F401
import app.features.reports.models  # noqa: F401
import app.features.sessions.models  # noqa: F401
from app.api.deps import get_db
from app.db.base import Base
from app.features.identity import repository as repo
from app.main import app


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignores ON DELETE rules unless asked; Postgres always applies
    # them, and account deletion relies on them.
    @event.listens_for(engine.sync_engine, "connect")
    def _foreign_keys_on(dbapi_connection, _record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(test_engine):
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def seeded_admin(session_factory):
    email = "admin@test.local"
    async with session_factory() as db:
        user = await repo.create_user(
            db, email=email, email_verified_at=datetime.now(UTC)
        )
        await repo.ensure_role(db, user.id, "admin")
        await db.commit()
    return email


@pytest_asyncio.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()
