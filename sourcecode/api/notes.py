from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Note, Task
from schemas.task_schema import NoteOut

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=List[NoteOut])
def list_notes(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Note.id,
            Note.raw_text,
            Note.created_at,
            func.count(Task.id).label("task_count"),
        )
        .outerjoin(Task, Task.note_id == Note.id)
        .group_by(Note.id, Note.raw_text, Note.created_at)
        .order_by(Note.created_at.desc())
        .all()
    )

    return [
        NoteOut(id=r.id, raw_text=r.raw_text, created_at=r.created_at, task_count=r.task_count)
        for r in rows
    ]