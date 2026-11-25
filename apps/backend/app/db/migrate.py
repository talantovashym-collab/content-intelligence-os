"""Bring the database schema to the latest Alembic revision.

Runs automatically when the API starts (see app.main lifespan), or by hand:

    python -m app.db.migrate

Databases created before Alembic was introduced (by Base.metadata.create_all)
already contain every baseline table but have no ``alembic_version`` table.
Those are stamped at the baseline revision first, so the baseline's
CREATE TABLE statements are skipped and only later migrations are applied.
"""

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

BASELINE_REVISION = "0001"
ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"

# Tables created by the baseline migration (0001). A legacy create_all database
# must already have all of them before it can safely be stamped at the baseline.
BASELINE_TABLES = frozenset({
    "analytics", "api_keys", "creative_strategies", "investigations",
    "knowledge_entries", "opportunities", "productions", "projects",
    "publications", "references", "sessions", "system_logs", "tests",
    "user_preferences", "users",
})


async def _existing_tables() -> set[str]:
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as conn:
            return set(await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names()))
    finally:
        await engine.dispose()


def run_migrations() -> None:
    """Stamp a legacy create_all database if needed, then upgrade to head.

    Must be called from a thread with no running event loop (Alembic's env.py
    uses asyncio.run); from async code use ``await asyncio.to_thread(run_migrations)``.
    """
    cfg = Config(str(ALEMBIC_INI))
    tables = asyncio.run(_existing_tables())

    if "alembic_version" not in tables and tables & BASELINE_TABLES:
        missing = BASELINE_TABLES - tables
        if missing:
            raise RuntimeError(
                "Database has some application tables but no alembic_version table, and is "
                f"missing baseline tables {sorted(missing)}; refusing to guess its schema. "
                "Fix it by hand, then run `alembic stamp 0001` and `alembic upgrade head`."
            )
        command.stamp(cfg, BASELINE_REVISION)

    command.upgrade(cfg, "head")


if __name__ == "__main__":
    run_migrations()
