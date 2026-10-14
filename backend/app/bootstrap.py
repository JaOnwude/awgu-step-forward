from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from alembic.command import upgrade
from alembic.config import Config

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _upgrade_to_head() -> None:
    config = Config(str(_BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    upgrade(config, "head")


async def _seed() -> None:
    from app.scripts.seed import seed

    await seed()

    try:
        from app.scripts import seed_demo
    except ImportError:
        return

    try:
        await seed_demo.seed_demo()
    except Exception:
        logger.warning("Demo data seeding skipped.", exc_info=True)


async def bootstrap() -> None:
    """Apply migrations and seed sample data when running locally.

    Disabled outside ``development`` or when ``DEV_BOOTSTRAP=false``, so this
    never runs against a real environment.
    """
    settings = get_settings()
    if settings.environment != "development" or not settings.dev_bootstrap:
        return

    print("Applying database migrations...")
    try:
        await asyncio.to_thread(_upgrade_to_head)
    except Exception:
        print(
            "Database migration failed. Is Postgres running? "
            "Start it with: docker compose up -d"
        )
        raise

    print("Seeding development data...")
    await _seed()
