from datetime import date

from backend.app.board_catalog import deterministic_board_for_date, get_board, load_board_catalog


def test_load_board_catalog_contains_generated_boards():
    boards = load_board_catalog()
    assert [board.valid_from for board in boards] == [1000, 1200, 1400, 1500, 1700, 1800]
    assert {board.region for board in boards} == {"Europe + Mediterranean"}


def test_deterministic_daily_selection_is_stable():
    first = deterministic_board_for_date(date(2026, 6, 9))
    second = deterministic_board_for_date(date(2026, 6, 9))
    assert first.board_id == second.board_id
    assert first.board_id in {board.board_id for board in load_board_catalog()}


def test_get_board_by_id():
    board = get_board("europe-med-1500")
    assert len(board.territories) == 70
    assert sum(1 for territory in board.territories if territory.in_play) == 68
