from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sourcecode.config import settings
from sourcecode.db.database import Base, engine
from sourcecode.models import task  # noqa: F401 -- registers models on Base.metadata
from sourcecode.api import tasks, extract

app = FastAPI(title="Mini AI Project Manager Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(extract.router)


@app.on_event("startup")
def on_startup():
    # MVP: create tables directly (no Alembic migrations per project plan Section 4.3)
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
