from typing import Literal

from fastapi import APIRouter, Query, Depends
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Score, User
from ..schemas import GameMode, GameTier, LeaderboardEntry

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])


@router.get("", response_model=list[LeaderboardEntry])
async def fetch_leaderboard(
    mode: GameMode,
    tier: GameTier,
    window: Literal["daily", "all_time"] = "daily",
    board_id: str | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    stmt: Select = (
        select(User.display_name, Score.score, Score.elapsed_ms, Score.submitted_at)
        .join(User, User.id == Score.user_id)
        .where(Score.mode == mode, Score.tier == tier)
        .order_by(Score.score.desc(), Score.elapsed_ms.asc(), Score.submitted_at.asc())
        .limit(limit)
    )
    if window == "daily":
        if board_id is None:
            return []
        stmt = stmt.where(Score.board_id == board_id)

    rows = (await session.execute(stmt)).all()
    return [
        LeaderboardEntry(
            rank=index + 1,
            display_name=row.display_name,
            score=row.score,
            elapsed_ms=row.elapsed_ms,
            submitted_at=row.submitted_at,
        )
        for index, row in enumerate(rows)
    ]
