from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import auth, boards, entities, leaderboards, root, scores

settings = get_settings()

app = FastAPI(title="Empyr API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(boards.router)
app.include_router(scores.router)
app.include_router(leaderboards.router)
app.include_router(entities.router)
app.include_router(root.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
