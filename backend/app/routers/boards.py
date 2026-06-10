from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..board_catalog import deterministic_board_for_date, get_board
from ..db import get_session
from ..models import DailyBoard
from ..schemas import BoardMetadata, DailyBoardResponse

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("/daily/{play_date}", response_model=DailyBoardResponse)
async def fetch_daily_board(play_date: date, session: AsyncSession = Depends(get_session)) -> DailyBoardResponse:
    existing = await session.scalar(select(DailyBoard).where(DailyBoard.play_date == play_date))
    if existing is not None:
        board = get_board(existing.board_id)
        return DailyBoardResponse(play_date=play_date, board=board, clue=existing.clue)

    board = deterministic_board_for_date(play_date)
    daily = DailyBoard(play_date=play_date, board_id=board.board_id, clue=board.change_note)
    session.add(daily)
    await session.commit()
    return DailyBoardResponse(play_date=play_date, board=board, clue=board.change_note)


@router.get("/{board_id}", response_model=BoardMetadata)
async def fetch_board(board_id: str) -> BoardMetadata:
    return get_board(board_id)
