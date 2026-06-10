CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(80) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE daily_boards (
    id BIGSERIAL PRIMARY KEY,
    play_date DATE NOT NULL UNIQUE,
    board_id VARCHAR(160) NOT NULL,
    clue TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scores (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    board_id VARCHAR(160) NOT NULL,
    mode VARCHAR(32) NOT NULL,
    tier VARCHAR(32) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_scores_daily_leaderboard ON scores (board_id, mode, tier, score DESC, elapsed_ms ASC, submitted_at ASC);
CREATE INDEX ix_scores_all_time_leaderboard ON scores (mode, tier, score DESC, elapsed_ms ASC, submitted_at ASC);

CREATE TABLE streaks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
    best_count INTEGER NOT NULL DEFAULT 0 CHECK (best_count >= 0),
    last_played_date DATE
);

CREATE TABLE entity_summaries (
    canonical_name VARCHAR(240) PRIMARY KEY,
    summary TEXT NOT NULL,
    wikidata_qid VARCHAR(32),
    commons_image_url TEXT,
    image_license TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
