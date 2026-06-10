import json
from datetime import date
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from .schemas import BoardMetadata

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "data" / "processed" / "metadata" / "border_states.json"


@lru_cache
def load_board_catalog() -> list[BoardMetadata]:
    if not CATALOG_PATH.exists():
        return []
    data = json.loads(CATALOG_PATH.read_text())
    return [BoardMetadata.model_validate(item) for item in data.get("border_states", [])]


def get_board(board_id: str) -> BoardMetadata:
    for board in load_board_catalog():
        if board.board_id == board_id:
            return board
    raise HTTPException(status_code=404, detail="Board not found")


def deterministic_board_for_date(play_date: date) -> BoardMetadata:
    boards = sorted(load_board_catalog(), key=lambda board: board.board_id)
    if not boards:
        raise HTTPException(status_code=503, detail="No border-state metadata has been generated")
    index = play_date.toordinal() % len(boards)
    return boards[index]
