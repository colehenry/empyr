#!/usr/bin/env python3.11
import asyncio
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.board_catalog import deterministic_board_for_date
from backend.app.db import SessionLocal
from backend.app.models import DailyBoard, EntitySummary


async def main() -> None:
    board = deterministic_board_for_date(date(2026, 6, 9))
    async with SessionLocal() as session:
        existing_daily = await session.scalar(select(DailyBoard).where(DailyBoard.play_date == date(2026, 6, 9)))
        if existing_daily is None:
            session.add(DailyBoard(play_date=date(2026, 6, 9), board_id=board.board_id, clue=board.change_note))

        for territory in board.territories:
            existing_entity = await session.get(EntitySummary, territory.canonical_name)
            if existing_entity is None:
                session.add(
                    EntitySummary(
                        canonical_name=territory.canonical_name,
                        summary="Editorial summary pending.",
                        wikidata_qid=territory.wikidata_qid,
                    )
                )

        await session.commit()
    print(f"Seeded local database for {board.board_id}")


if __name__ == "__main__":
    asyncio.run(main())
