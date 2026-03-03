"""
Alembic migration 환경 설정 (사양서 §12)
DATABASE_URL 환경변수에서 DB URL 을 읽는다.
"""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# alembic.ini 로거 설정 적용
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLAlchemy 메타데이터 (모델 auto-detect용)
from app.models import Base   # noqa: E402
target_metadata = Base.metadata

# DATABASE_URL 주입 (asyncpg → psycopg2 드라이버 변환)
_raw_url = os.environ.get("DATABASE_URL", "")
# asyncpg URL 을 sync psycopg2 URL 로 변환
_sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://")
config.set_main_option("sqlalchemy.url", _sync_url)


def run_migrations_offline() -> None:
    """오프라인 모드: SQL 스크립트만 생성."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """온라인 모드: 실제 DB 연결 후 마이그레이션 실행."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
