from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models import Score, Streak, User
from ..schemas import ScoreCreate, ScorePublic

router = APIRouter(prefix="/scores", tags=["scores"])


@router.post("", response_model=ScorePublic, status_code=201)
async def submit_score(
    payload: ScoreCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ScorePublic:
    score = Score(
        user_id=user.id,
        board_id=payload.board_id,
        mode=payload.mode,
        tier=payload.tier,
        score=payload.score,
        elapsed_ms=payload.elapsed_ms,
    )
    session.add(score)
    await session.flush()
    await _update_streak(session, user.id)
    await session.commit()
    await session.refresh(score)
    return ScorePublic.model_validate(score, from_attributes=True)


async def _update_streak(session: AsyncSession, user_id: int) -> None:
    from datetime import date

    today = date.today()
    streak = await session.scalar(select(Streak).where(Streak.user_id == user_id))
    if streak is None:
        session.add(Streak(user_id=user_id, current_count=1, best_count=1, last_played_date=today))
        return
    if streak.last_played_date == today:
        return
    if streak.last_played_date == today - timedelta(days=1):
        streak.current_count += 1
    else:
        streak.current_count = 1
    streak.best_count = max(streak.best_count, streak.current_count)
    streak.last_played_date = today
