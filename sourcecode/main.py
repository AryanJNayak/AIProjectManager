from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.database import Base, engine
from models import task  # noqa: F401 -- registers models on Base.metadata
from api import tasks, extract

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)