from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Task, Note, StatusEnum
from schemas.task_schema import (
    ExtractRequest,
    ExtractResponse,
    ProposedUpdate,
    ConfirmRequest,
    ConfirmResponse,
    TaskOut,
)
from services.matcher import find_candidate_tasks
from services.extraction_chain import extract_tasks

router = APIRouter(prefix="/api/extract", tags=["extract"])


@router.post("", response_model=ExtractResponse)
def run_extraction(payload: ExtractRequest, db: Session = Depends(get_db)):
    """Purpose: Process a raw note, match it with existing open tasks, and create extraction results.

    Inputs: An ExtractRequest containing the note text and the database session.

    Outputs: An ExtractResponse containing newly created tasks and proposed updates for existing tasks.

    Example: POST /api/extract with a note such as "Review the API endpoint by Friday".
    """
    # 1. Save the raw note (Section 5.1 - notes table)
    note = Note(raw_text=payload.text)
    db.add(note)
    db.commit()
    db.refresh(note)

    # 2. Fetch open tasks (status != Done) as matching context
    open_tasks = (
        db.query(Task)
        .filter(Task.status != StatusEnum.done)
        .all()
    )
    open_tasks_dicts = [
        {"id": t.id, "description": t.description, "owner": t.owner} for t in open_tasks
    ]

    # 3. Pre-filter candidates with rapidfuzz before hitting the LLM
    candidates = find_candidate_tasks(payload.text, open_tasks_dicts)

    # 4. Run the LangChain extraction/reconciliation chain
    try:
        result = extract_tasks(payload.text, candidates)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")

    open_tasks_by_id = {t.id: t for t in open_tasks}

    created: list[TaskOut] = []
    proposed_updates: list[ProposedUpdate] = []

    for item in result.tasks:
        if item.action == "new":
            task = Task(
                note_id=note.id,
                description=item.description,
                due_date=item.due_date or None,
                owner=item.owner,
                priority=item.priority.value,
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            created.append(TaskOut.model_validate(task))

        elif item.action == "update":
            existing = open_tasks_by_id.get(item.existing_task_id)
            if not existing:
                # LLM hallucinated an id that wasn't in the candidate set -- skip safely
                continue

            current_values = {
                field: getattr(existing, field) for field in item.changes.keys()
            }
            proposed_updates.append(
                ProposedUpdate(
                    task_id=existing.id,
                    description=existing.description,
                    current=current_values,
                    changes=item.changes,
                )
            )
            # NOT sourcecodelied yet -- PM must confirm via /api/extract/confirm

    return ExtractResponse(created=created, proposed_updates=proposed_updates)


@router.post("/confirm", response_model=ConfirmResponse)
def confirm_updates(payload: ConfirmRequest, db: Session = Depends(get_db)):
    """Purpose: Apply confirmed updates to existing tasks after extraction review.

    Inputs: A ConfirmRequest with the selected task updates and the database session.

    Outputs: A ConfirmResponse containing the updated task records.

    Example: POST /api/extract/confirm with approved task changes.
    """
    updated: list[TaskOut] = []

    for approved in payload.approved:
        task = db.query(Task).filter(Task.id == approved.task_id).first()
        if not task:
            continue
        for field, value in approved.changes.items():
            if hasattr(task, field):
                setattr(task, field, value)
        db.commit()
        db.refresh(task)
        updated.append(TaskOut.model_validate(task))

    return ConfirmResponse(updated=updated)
