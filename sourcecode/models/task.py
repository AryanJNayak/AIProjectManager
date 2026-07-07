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

from db.database import Base


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
    task_links = relationship(
        "TaskNoteLink", back_populates="note", cascade="all, delete-orphan"
    )


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
    note_links = relationship(
        "TaskNoteLink", back_populates="task", cascade="all, delete-orphan"
    )


class TaskNoteLink(Base):
    """Junction table that records every note that created or updated a task.

    This allows the UI to show the full audit trail of which notes touched a
    given task, ordered by created_at DESC.
    """

    __tablename__ = "task_note_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(
        Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    note_id = Column(
        Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False
    )
    # "created" — the note that originally generated this task
    # "updated" — a later note that modified the task via the PM approval flow
    link_type = Column(String(20), nullable=False, default="created")
    created_at = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="note_links")
    note = relationship("Note", back_populates="task_links")
