from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.database import Base, engine
from models import task  # noqa: F401 -- registers models on Base.metadata
from api import tasks, extract, notes

app = FastAPI(title="Mini AI Project Manager Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(extract.router)
app.include_router(notes.router)

@app.on_event("startup")
def on_startup():
    """Purpose: Initialize database tables when the FastAPI app starts.

    Inputs: None.

    Outputs: None. The function creates all SQLAlchemy models in the database.

    Example: The application startup event runs this function automatically on launch.
    """
    # MVP: create tables directly (no Alembic migrations per project plan Section 4.3)
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    """Purpose: Return a simple health-check response for the API.

    Inputs: None.

    Outputs: A JSON object with the application status.

    Example: GET /health -> {"status": "ok"}
    """
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)