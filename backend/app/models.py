from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (
        CheckConstraint("score >= 0", name="ck_scores_score_nonnegative"),
        CheckConstraint("elapsed_ms >= 0", name="ck_scores_elapsed_nonnegative"),
        Index("ix_scores_daily_leaderboard", "board_id", "mode", "tier", "score", "elapsed_ms", "submitted_at"),
        Index("ix_scores_all_time_leaderboard", "mode", "tier", "score", "elapsed_ms", "submitted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    board_id: Mapped[str] = mapped_column(String(160), index=True)
    mode: Mapped[str] = mapped_column(String(32), index=True)
    tier: Mapped[str] = mapped_column(String(32), index=True)
    score: Mapped[int] = mapped_column(Integer)
    elapsed_ms: Mapped[int] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class Streak(Base):
    __tablename__ = "streaks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    current_count: Mapped[int] = mapped_column(Integer, default=0)
    best_count: Mapped[int] = mapped_column(Integer, default=0)
    last_played_date: Mapped[date | None] = mapped_column(Date)


class DailyBoard(Base):
    __tablename__ = "daily_boards"
    __table_args__ = (UniqueConstraint("play_date", name="uq_daily_boards_play_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    play_date: Mapped[date] = mapped_column(Date, index=True)
    board_id: Mapped[str] = mapped_column(String(160), index=True)
    clue: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EntitySummary(Base):
    __tablename__ = "entity_summaries"

    canonical_name: Mapped[str] = mapped_column(String(240), primary_key=True)
    summary: Mapped[str] = mapped_column(Text)
    wikidata_qid: Mapped[str | None] = mapped_column(String(32))
    commons_image_url: Mapped[str | None] = mapped_column(Text)
    image_license: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
