from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

GameMode = Literal["identify", "guess_year"]
GameTier = Literal["explorer", "historian"]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=12, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    created_at: datetime


class BoardTerritory(BaseModel):
    canonical_name: str
    wikidata_qid: str | None = None
    type: str
    in_play: bool


class BoardMetadata(BaseModel):
    board_id: str
    region: str
    valid_from: int
    valid_to: int
    confidence: str
    change_note: str
    geojson_url: str
    attribution: str
    source: dict
    territories: list[BoardTerritory]


class DailyBoardResponse(BaseModel):
    play_date: date
    board: BoardMetadata
    clue: str


class ScoreCreate(BaseModel):
    board_id: str = Field(min_length=1, max_length=160)
    mode: GameMode
    tier: GameTier
    score: int = Field(ge=0)
    elapsed_ms: int = Field(ge=0)


class ScorePublic(BaseModel):
    id: int
    board_id: str
    mode: str
    tier: str
    score: int
    elapsed_ms: int
    submitted_at: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    score: int
    elapsed_ms: int
    submitted_at: datetime


class EntitySummaryPublic(BaseModel):
    canonical_name: str
    summary: str
    wikidata_qid: str | None = None
    commons_image_url: str | None = None
    image_license: str | None = None
