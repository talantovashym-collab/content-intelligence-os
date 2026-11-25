"""Alembic environment: async SQLAlchemy engine, URL and metadata from the app."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.db.session import Base
import app.models  # noqa: F401  (registers every model on Base.metadata)

config = context.config
if config.config_file_name is not None:
    # Keep the host app's loggers (uvicorn, structlog) alive when run in-process
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Explicit -x url=... or a URL set programmatically wins; otherwise use app settings
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of executing it (alembic upgrade head --sql)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
