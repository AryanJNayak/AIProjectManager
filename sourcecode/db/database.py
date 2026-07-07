from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings


# pool_pre_ping avoids "MySQL server has gone away" errors on idle connections
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Purpose: Provide a database session for each FastAPI request.

    Inputs: None.

    Outputs: A SQLAlchemy session object that is closed after the request completes.

    Example: Used as a dependency in route handlers such as list_tasks and update_task.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
