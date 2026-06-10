# Local Development

## Database

Start Postgres:

```bash
docker compose up -d postgres
```

Create local backend env:

```bash
cp backend/.env.example backend/.env
```

Run migrations and seed the 1500 board:

```bash
backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
backend/.venv/bin/python scripts/seed_local.py
```

## Backend

```bash
backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

The map view prefers `NEXT_PUBLIC_API_URL` for board metadata and falls back to the static catalog under `frontend/public/data/metadata`.
