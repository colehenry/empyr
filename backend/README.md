# Empyr Backend

FastAPI service for Step 1.B. It owns auth, users, scores, streaks, daily board lookup, leaderboards, and entity summaries. The database target is plain Neon Postgres; no PostGIS is used.

## Environment

Required:

- `DATABASE_URL`: Postgres URL, e.g. `postgresql+asyncpg://user:pass@host/db?ssl=require`
- `SECRET_KEY`: long random string used to sign bearer tokens

Optional:

- `ACCESS_TOKEN_EXPIRE_MINUTES`: defaults to `43200`
- `CORS_ORIGINS`: comma-separated origins; defaults to `*`

## Run locally

```bash
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

## Database

Schema is defined in `backend/app/models.py` and mirrored in `backend/schema.sql` for review. Use Alembic for production migrations once the Neon database URL is configured.
