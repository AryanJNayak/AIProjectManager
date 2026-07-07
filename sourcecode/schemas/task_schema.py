from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, ConfigDict, field_validator


class Priority(str, Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"


class Status(str, Enum):
    todo = "To Do"
    in_progress = "In Progress"
    done = "Done"


# ---------- Task CRUD schemas ----------

class TaskBase(BaseModel):
    description: str
    due_date: Optional[date] = None
    owner: Optional[str] = None
    priority: Priority = Priority.Medium
    status: Status = Status.todo


class TaskCreate(TaskBase):
    note_id: Optional[int] = None


class TaskUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[date] = None
    owner: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def due_date_not_in_past(cls, v: object) -> object:
        if v is None:
            return v
        d = v if isinstance(v, date) else date.fromisoformat(str(v))
        if d < date.today():
            raise ValueError(
                f"Due date {d} is in the past. "
                "Please use today's date or a future date."
            )
        return v


class TaskOut(BaseModel):
    id: int
    note_id: Optional[int] = Field(default=None, serialization_alias="noteId")
    description: str
    due_date: Optional[date] = Field(default=None, serialization_alias="dueDate")
    owner: Optional[str] = None
    priority: Priority = Priority.Medium
    status: Status = Status.todo
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------- Note history link ----------

class NoteLinkOut(BaseModel):
    """A note that created or updated a specific task — used for the task detail view."""
    note_id: int = Field(serialization_alias="noteId")
    note_text: str = Field(serialization_alias="noteText")
    link_type: str = Field(serialization_alias="linkType")   # "created" | "updated"
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


# ---------- LLM extraction contract ----------

class ExtractedNewTask(BaseModel):
    action: Literal["new"]
    description: str
    due_date: Optional[str] = Field(
        default=None, description="Normalized to YYYY-MM-DD, or null if not mentioned"
    )
    owner: Optional[str] = None
    priority: Priority = Priority.Medium


class ExtractedUpdateTask(BaseModel):
    action: Literal["update"]
    existing_task_id: int
    matched_on: Optional[str] = None
    changes: dict = Field(description="Only the fields that differ from the existing task")


class ExtractionResult(BaseModel):
    """The structured output schema enforced via LangChain's with_structured_output()."""
    tasks: List[ExtractedNewTask | ExtractedUpdateTask]


# ---------- /api/extract preview response (nothing saved yet) ----------

class ProposedNewTask(BaseModel):
    """A new task from the LLM — not yet persisted. Returned for user review."""
    description: str
    due_date: Optional[str] = Field(
        default=None,
        serialization_alias="dueDate",
        description="YYYY-MM-DD or null",
    )
    owner: Optional[str] = None
    priority: Priority = Priority.Medium

    model_config = ConfigDict(populate_by_name=True)


class ProposedUpdate(BaseModel):
    task_id: int = Field(serialization_alias="taskId")
    description: str
    current: dict
    changes: dict

    model_config = ConfigDict(populate_by_name=True)


class ExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)


class ExtractResponse(BaseModel):
    """Extraction preview — NOTHING is written to the DB until /api/extract/confirm-all."""
    note_text: str = Field(serialization_alias="noteText")
    structured_new: List[ProposedNewTask] = Field(
        default_factory=list, serialization_alias="structuredNew"
    )
    unstructured_new: List[ProposedNewTask] = Field(
        default_factory=list, serialization_alias="unstructuredNew"
    )
    proposed_updates: List[ProposedUpdate] = Field(
        default_factory=list, serialization_alias="proposedUpdates"
    )

    model_config = ConfigDict(populate_by_name=True)


# ---------- /api/extract/confirm-all (deferred save) ----------

class ConfirmNewTaskInput(BaseModel):
    """A user-reviewed new task ready to be persisted (description is immutable)."""
    description: str
    due_date: Optional[date] = None
    owner: Optional[str] = None
    priority: Priority = Priority.Medium
    status: Status = Status.todo

    @field_validator("due_date", mode="before")
    @classmethod
    def due_date_not_in_past(cls, v: object) -> object:
        if v is None:
            return v
        d = v if isinstance(v, date) else date.fromisoformat(str(v))
        if d < date.today():
            raise ValueError(
                f"Due date {d} is in the past. "
                "Please use today's date or a future date."
            )
        return v


class ConfirmAllRequest(BaseModel):
    """Save note + all new tasks + apply approved updates in one DB transaction."""
    note_text: str
    tasks_to_create: List[ConfirmNewTaskInput]
    approved_updates: List[dict] = []   # [{task_id, changes}]


class ConfirmAllResponse(BaseModel):
    note_id: int = Field(serialization_alias="noteId")   # ID of the saved note for audit-link chaining
    created: List[TaskOut]
    updated: List[TaskOut]


# ---------- /api/extract/confirm (existing-task updates only) ----------

class approvedUpdate(BaseModel):
    task_id: int
    changes: dict


class ConfirmRequest(BaseModel):
    approved: List[approvedUpdate]
    # When provided, a TaskNoteLink(type='updated') is written for every
    # approved task so the note-history panel stays complete.
    note_id: Optional[int] = None


class ConfirmResponse(BaseModel):
    updated: List[TaskOut]


# ---------- /api/notes ----------

class NoteOut(BaseModel):
    id: int
    raw_text: str = Field(serialization_alias="rawText")
    created_at: datetime = Field(serialization_alias="createdAt")
    task_count: int = Field(serialization_alias="taskCount")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)