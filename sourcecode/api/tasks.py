from datetime import datetime
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Task, Note, TaskNoteLink, StatusEnum
from schemas.task_schema import TaskOut, TaskUpdate, Priority, Status, NoteLinkOut
from services.csv_export import tasks_to_csv, tasks_to_excel


class TaskExportRequest(BaseModel):
    tables: List[Literal["structured", "unstructured"]]


class ExportTableSummary(BaseModel):
    name: str
    records: int


class TaskExportPreviewResponse(BaseModel):
    filename: str
    size: int
    createdAt: datetime
    format: Literal["csv", "xlsx"]
    tables: List[ExportTableSummary]

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskOut])
def list_tasks(
    owner: Optional[str] = None,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return (cap 500)"),
    db: Session = Depends(get_db),
):
    """Purpose: Retrieve tasks from the database using optional filters and pagination.

    Inputs: Optional owner, status, priority filters; skip/limit for pagination; DB session.

    Outputs: A paginated list of task records sorted by most recently created first.

    Example: GET /api/tasks?owner=alice&status=open&skip=0&limit=50
    """
    query = db.query(Task)
    if owner:
        query = query.filter(Task.owner == owner)
    if status:
        query = query.filter(Task.status == status.value)
    if priority:
        query = query.filter(Task.priority == priority.value)
    return query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/export")
def export_tasks(
    owner: Optional[str] = None,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(10000, ge=1, le=10000, description="Max records in export (cap 10,000)"),
    db: Session = Depends(get_db),
):
    """Purpose: Export filtered tasks as a CSV file for download.

    Inputs: Optional owner, status, priority filters; skip/limit for export range; DB session.

    Outputs: A streaming CSV response attached for download.

    Example: GET /api/tasks/export?status=open&limit=500
    """
    query = db.query(Task)
    if owner:
        query = query.filter(Task.owner == owner)
    if status:
        query = query.filter(Task.status == status.value)
    if priority:
        query = query.filter(Task.priority == priority.value)
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

    buf = tasks_to_csv(tasks)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tasks.csv"},
    )


@router.post("/export/preview", response_model=TaskExportPreviewResponse)
def preview_selected_tasks(payload: TaskExportRequest, db: Session = Depends(get_db)):
    """Purpose: Preview the export metadata for selected task tables."""
    if not payload.tables:
        raise HTTPException(status_code=422, detail="Select at least one table to export.")

    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    tables: dict[str, List[Task]] = {}

    if "structured" in payload.tables:
        tables["Structured"] = [
            task for task in tasks if task.due_date and task.owner
        ]
    if "unstructured" in payload.tables:
        tables["Unstructured"] = [
            task for task in tasks if not task.due_date or not task.owner
        ]

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    if len(tables) > 1:
        buf = tasks_to_excel(tables)
        filename = f"e2m_ai_project_manager_{timestamp}.xlsx"
        file_format = "xlsx"
    else:
        single_tasks = next(iter(tables.values()), [])
        buf = tasks_to_csv(single_tasks)
        filename = f"e2m_ai_project_manager_{timestamp}.csv"
        file_format = "csv"

    return TaskExportPreviewResponse(
        filename=filename,
        size=len(buf.getvalue() if hasattr(buf, 'getvalue') else buf.read()),
        createdAt=datetime.now(),
        format=file_format,
        tables=[ExportTableSummary(name=name, records=len(rows)) for name, rows in tables.items()],
    )


@router.post("/export", response_class=StreamingResponse)
def export_selected_tasks(payload: TaskExportRequest, db: Session = Depends(get_db)):
    """Purpose: Generate a downloadable export of selected task tables."""
    if not payload.tables:
        raise HTTPException(status_code=422, detail="Select at least one table to export.")

    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    tables: dict[str, List[Task]] = {}

    if "structured" in payload.tables:
        tables["Structured"] = [
            task for task in tasks if task.due_date and task.owner
        ]
    if "unstructured" in payload.tables:
        tables["Unstructured"] = [
            task for task in tasks if not task.due_date or not task.owner
        ]

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    if len(tables) > 1:
        buf = tasks_to_excel(tables)
        filename = f"e2m_ai_project_manager_{timestamp}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        single_tasks = next(iter(tables.values()), [])
        buf = tasks_to_csv(single_tasks)
        filename = f"e2m_ai_project_manager_{timestamp}.csv"
        media_type = "text/csv"

    return StreamingResponse(
        buf,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{task_id}/notes", response_model=List[NoteLinkOut])
def get_task_notes(task_id: int, db: Session = Depends(get_db)):
    """Purpose: Return the full note audit trail for a task, newest first.

    Inputs: task_id path parameter and DB session.

    Outputs: List of NoteLinkOut — each entry carries the note text, link type
             ('created' or 'updated'), and the timestamp of the link.

    Example: GET /api/tasks/42/notes
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    rows = (
        db.query(TaskNoteLink, Note)
        .join(Note, TaskNoteLink.note_id == Note.id)
        .filter(TaskNoteLink.task_id == task_id)
        .order_by(desc(TaskNoteLink.created_at))
        .all()
    )

    return [
        NoteLinkOut(
            note_id=link.note_id,
            note_text=note.raw_text,
            link_type=link.link_type,
            created_at=link.created_at or note.created_at,
        )
        for link, note in rows
    ]


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Purpose: Retrieve a single task by its identifier.

    Inputs: The task_id and the database session.

    Outputs: The matching task record or a 404 error if the task does not exist.

    Example: GET /api/tasks/42
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    """Purpose: Apply partial updates to an existing task.

    Rejects changes to tasks that are already marked as 'Done' (403) and rejects
    any due_date in the past (422 via Pydantic validator on TaskUpdate).

    Inputs: The task_id, a TaskUpdate payload with fields to change, and the database session.

    Outputs: The updated task record or an error if validation fails.

    Example: PATCH /api/tasks/42 with {"status": "done"}
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Done tasks are read-only — neither manual edits nor LLM updates are allowed
    if task.status == StatusEnum.done:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Task \"{task.description[:60]}\" is marked as Done and is read-only. "
                "Re-open it by changing its status first."
            ),
        )

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Purpose: Delete a task from the database by identifier.

    Inputs: The task_id and the database session.

    Outputs: A 204 success response or a 404 error if the task does not exist.

    Example: DELETE /api/tasks/42
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None
