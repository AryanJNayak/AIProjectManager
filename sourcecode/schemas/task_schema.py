from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, ConfigDict


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


class TaskOut(TaskBase):
    id: int
    note_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- LLM extraction contract (Section 5.2 of the plan) ----------

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


# ---------- /api/extract request/response ----------

class ExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=40000)  # ~5,000 words safety cap


class ProposedUpdate(BaseModel):
    task_id: int
    description: str
    current: dict
    changes: dict


class ExtractResponse(BaseModel):
    created: List[TaskOut]
    proposed_updates: List[ProposedUpdate]


class sourcecoderovedUpdate(BaseModel):
    task_id: int
    changes: dict


class ConfirmRequest(BaseModel):
    sourcecoderoved: List[sourcecoderovedUpdate]


class ConfirmResponse(BaseModel):
    updated: List[TaskOut]
