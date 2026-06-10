"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_display_name"), "users", ["display_name"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_auth_sessions_token_jti"), "auth_sessions", ["token_jti"], unique=True)
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"], unique=False)

    op.create_table(
        "daily_boards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("play_date", sa.Date(), nullable=False),
        sa.Column("board_id", sa.String(length=160), nullable=False),
        sa.Column("clue", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("play_date", name="uq_daily_boards_play_date"),
    )
    op.create_index(op.f("ix_daily_boards_play_date"), "daily_boards", ["play_date"], unique=False)
    op.create_index(op.f("ix_daily_boards_board_id"), "daily_boards", ["board_id"], unique=False)

    op.create_table(
        "scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("board_id", sa.String(length=160), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("tier", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("elapsed_ms", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("score >= 0", name="ck_scores_score_nonnegative"),
        sa.CheckConstraint("elapsed_ms >= 0", name="ck_scores_elapsed_nonnegative"),
    )
    op.create_index(op.f("ix_scores_user_id"), "scores", ["user_id"], unique=False)
    op.create_index(op.f("ix_scores_board_id"), "scores", ["board_id"], unique=False)
    op.create_index(op.f("ix_scores_mode"), "scores", ["mode"], unique=False)
    op.create_index(op.f("ix_scores_tier"), "scores", ["tier"], unique=False)
    op.create_index(op.f("ix_scores_submitted_at"), "scores", ["submitted_at"], unique=False)
    op.create_index(
        "ix_scores_daily_leaderboard",
        "scores",
        ["board_id", "mode", "tier", "score", "elapsed_ms", "submitted_at"],
        unique=False,
    )
    op.create_index(
        "ix_scores_all_time_leaderboard",
        "scores",
        ["mode", "tier", "score", "elapsed_ms", "submitted_at"],
        unique=False,
    )

    op.create_table(
        "streaks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("best_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_played_date", sa.Date(), nullable=True),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "entity_summaries",
        sa.Column("canonical_name", sa.String(length=240), primary_key=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("wikidata_qid", sa.String(length=32), nullable=True),
        sa.Column("commons_image_url", sa.Text(), nullable=True),
        sa.Column("image_license", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("entity_summaries")
    op.drop_table("streaks")
    op.drop_index("ix_scores_all_time_leaderboard", table_name="scores")
    op.drop_index("ix_scores_daily_leaderboard", table_name="scores")
    op.drop_table("scores")
    op.drop_table("daily_boards")
    op.drop_table("auth_sessions")
    op.drop_index(op.f("ix_users_display_name"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
