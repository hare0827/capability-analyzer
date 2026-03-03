"""초기 스키마 생성

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── pgcrypto 확장 ────────────────────────────────────────────────────────
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="engineer"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="TRUE"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("role IN ('admin','engineer','viewer')", name="ck_users_role"),
    )

    # ── files ────────────────────────────────────────────────────────────────
    op.create_table(
        "files",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("uploader_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("sha256_hash", sa.CHAR(64), nullable=False),
        sa.Column("s3_key", sa.String(1000), nullable=True),
        sa.Column("size_bytes", sa.BigInteger, nullable=False),
        sa.Column("mime_type", sa.String(200), nullable=True),
        sa.Column("is_safe", sa.Boolean, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_files_sha256", "files", ["sha256_hash"])

    # ── analyses ─────────────────────────────────────────────────────────────
    op.create_table(
        "analyses",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("file_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("files.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_name",   sa.String(500),  nullable=True),
        sa.Column("part_number",    sa.String(200),  nullable=True),
        sa.Column("dimension_name", sa.String(200),  nullable=True),
        sa.Column("mode", sa.String(10), nullable=False),
        sa.Column("usl", sa.Double, nullable=False),
        sa.Column("lsl", sa.Double, nullable=False),
        sa.Column("nominal", sa.Double, nullable=True),
        sa.Column("subgroup_size", sa.SmallInteger, server_default="5"),
        sa.Column("sigma_method", sa.String(10), server_default="rbar"),
        sa.Column("outlier_removal", sa.Boolean, nullable=False, server_default="FALSE"),
        sa.Column("raw_data", sa.dialects.postgresql.JSONB, nullable=False),
        sa.Column("result_json", sa.dialects.postgresql.JSONB, nullable=False),
        sa.Column("client_ip", sa.dialects.postgresql.INET, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("mode IN ('cpk','ppk','dual')",   name="ck_analyses_mode"),
        sa.CheckConstraint("sigma_method IN ('rbar','sbar')", name="ck_analyses_sigma"),
    )
    op.create_index("idx_analyses_user_id",    "analyses", ["user_id"])
    op.create_index("idx_analyses_created_at", "analyses", ["created_at"], postgresql_ops={"created_at": "DESC"})
    op.create_index("idx_analyses_mode",       "analyses", ["mode"])

    # ── audit_logs ───────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger, sa.Identity(always=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action",      sa.String(100), nullable=False),
        sa.Column("resource",    sa.String(200), nullable=True),
        sa.Column("client_ip",   sa.dialects.postgresql.INET, nullable=True),
        sa.Column("status_code", sa.SmallInteger, nullable=True),
        sa.Column("detail",      sa.Text, nullable=True),
        sa.Column("created_at",  sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("idx_audit_logs_created", "audit_logs", ["created_at"],
                    postgresql_ops={"created_at": "DESC"})

    # ── updated_at 자동 갱신 트리거 (users) ─────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_users_updated_at ON users")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at()")
    op.drop_table("audit_logs")
    op.drop_table("analyses")
    op.drop_table("files")
    op.drop_table("users")
