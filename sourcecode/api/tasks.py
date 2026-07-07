from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Task
from schemas.task_schema import TaskOut, TaskUpdate, Priority, Status
from services.csv_export import tasks_to_csv

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskOut])
def list_tasks(
    owner: Optional[str] = None,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if owner:
        query = query.filter(Task.owner == owner)
    if status:
        query = query.filter(Task.status == status.value)
    if priority:
        query = query.filter(Task.priority == priority.value)
    return query.order_by(Task.created_at.desc()).all()


@router.get("/export")
def export_tasks(
    owner: Optional[str] = None,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if owner:
        query = query.filter(Task.owner == owner)
    if status:
        query = query.filter(Task.status == status.value)
    if priority:
        query = query.filter(Task.priority == priority.value)
    tasks = query.all()

    buf = tasks_to_csv(tasks)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tasks.csv"},
    )


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None
