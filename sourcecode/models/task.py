import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from sourcecode.db.database import Base


class PriorityEnum(str, enum.Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"


class StatusEnum(str, enum.Enum):
    todo = "To Do"
    in_progress = "In Progress"
    done = "Done"


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    tasks = relationship("Task", back_populates="note")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    description = Column(Text, nullable=False)
    due_date = Column(Date, nullable=True)
    owner = Column(String(100), nullable=True)
    priority = Column(Enum(PriorityEnum), nullable=False, default=PriorityEnum.Medium)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.todo)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    note = relationship("Note", back_populates="tasks")
