import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.models.db_models import create_tables
from backend.app.routers import events, metrics


app = FastAPI(title="Revenue Recovery API")

frontend_url = os.getenv("FRONTEND_URL")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

# Allow the Vite dev server (and any local origin) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")


@app.on_event("startup")
def initialize_database() -> None:
    """Ensure required SQLite tables exist before serving requests."""

    create_tables()