from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Task, Note, TaskNoteLink, StatusEnum
from schemas.task_schema import (
    ExtractRequest,
    ExtractResponse,
    ProposedNewTask,
    ProposedUpdate,
    ConfirmRequest,
    ConfirmResponse,
    ConfirmAllRequest,
    ConfirmAllResponse,
    TaskOut,
)
from services.matcher import find_candidate_tasks
from services.extraction_chain import extract_tasks

router = APIRouter(prefix="/api/extract", tags=["extract"])


@router.post("", response_model=ExtractResponse)
def run_extraction(payload: ExtractRequest, db: Session = Depends(get_db)):
    """Purpose: Preview extraction — run the LLM but save NOTHING to the database.

    A task is classified as 'structured' only when the LLM extracted BOTH a due_date
    AND an owner. Missing either field puts the task in 'unstructured_new', which
    triggers the user-review modal on the frontend.

    The caller must follow up with POST /api/extract/confirm-all to persist results
    after the user has reviewed and optionally edited them.

    Inputs: An ExtractRequest containing the raw note text and the DB session.

    Outputs: An ExtractResponse with structured_new, unstructured_new, and
             proposed_updates — all unsaved proposals for the frontend to render.

    Example: POST /api/extract with {"text": "Alice to finish onboarding doc by Friday"}
    """
    # 1. Fetch open tasks (status != Done) as context for update matching
    open_tasks = db.query(Task).filter(Task.status != StatusEnum.done).all()
    open_tasks_dicts = [
        {"id": t.id, "description": t.description, "owner": t.owner} for t in open_tasks
    ]

    # 2. Pre-filter candidates with rapidfuzz before hitting the LLM
    candidates = find_candidate_tasks(payload.text, open_tasks_dicts)

    # 3. Run the LangChain extraction / reconciliation chain
    try:
        result = extract_tasks(payload.text, candidates)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")

    open_tasks_by_id = {t.id: t for t in open_tasks}

    structured_new: list[ProposedNewTask] = []
    unstructured_new: list[ProposedNewTask] = []
    proposed_updates: list[ProposedUpdate] = []

    for item in result.tasks:
        if item.action == "new":
            proposed = ProposedNewTask(
                description=item.description,
                due_date=item.due_date or None,
                owner=item.owner,
                priority=item.priority,
            )
            # Structured = has BOTH due_date AND owner (Bug 1 fix)
            if item.due_date and item.owner:
                structured_new.append(proposed)
            else:
                unstructured_new.append(proposed)

        elif item.action == "update":
            existing = open_tasks_by_id.get(item.existing_task_id)
            if not existing:
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

    return ExtractResponse(
        note_text=payload.text,
        structured_new=structured_new,
        unstructured_new=unstructured_new,
        proposed_updates=proposed_updates,
    )


@router.post("/confirm-all", response_model=ConfirmAllResponse)
def confirm_all(payload: ConfirmAllRequest, db: Session = Depends(get_db)):
    """Purpose: Save note + all new tasks + apply approved updates in a single DB transaction.

    Also guards against duplicate notes (Bug 2): if the exact same note text already
    exists in the database, a 409 Conflict is returned before anything is written.

    Inputs: A ConfirmAllRequest with note text, tasks to create, and approved updates.

    Outputs: A ConfirmAllResponse with the newly created and updated TaskOut records.

    Example: POST /api/extract/confirm-all
    """
    # Bug 2: Reject duplicate notes
    note_text_clean = payload.note_text.strip()
    existing_note = db.query(Note).filter(Note.raw_text == note_text_clean).first()
    if existing_note:
        raise HTTPException(
            status_code=409,
            detail="This note has already been processed. Edit the note before re-submitting.",
        )

    # 1. Save the raw note
    note = Note(raw_text=note_text_clean)
    db.add(note)
    db.flush()  # assigns note.id within the transaction

    # 2. Create all new tasks and link them to this note
    created: list[TaskOut] = []
    for task_input in payload.tasks_to_create:
        task = Task(
            note_id=note.id,
            description=task_input.description,
            due_date=task_input.due_date or None,
            owner=task_input.owner or None,
            priority=task_input.priority.value,
            status=task_input.status.value,
        )
        db.add(task)
        db.flush()
        db.refresh(task)

        # Audit link: this note created this task
        db.add(TaskNoteLink(task_id=task.id, note_id=note.id, link_type="created"))
        created.append(TaskOut.model_validate(task))

    # 3. Apply approved updates to existing tasks and audit-link them
    updated: list[TaskOut] = []
    for approved in payload.approved_updates:
        task_id = approved.get("task_id")
        changes = approved.get("changes", {})
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            continue

        # Done tasks are read-only
        if task.status == StatusEnum.done:
            raise HTTPException(
                status_code=403,
                detail=(
                    f'Task "{task.description[:60]}" is marked as Done and is read-only. '
                    "Re-open it by changing its status first."
                ),
            )

        # Reject past due-dates coming from the LLM or the user
        new_due = changes.get("due_date")
        if new_due:
            try:
                d = new_due if isinstance(new_due, date_type) else date_type.fromisoformat(str(new_due))
                if d < date_type.today():
                    raise HTTPException(
                        status_code=422,
                        detail=f"Due date {d} is in the past. Please use today or a future date.",
                    )
            except (ValueError, TypeError):
                pass  # malformed date — let DB validation catch it

        for field, value in changes.items():
            if hasattr(task, field):
                setattr(task, field, value)
        db.flush()
        db.refresh(task)

        # Audit link: this note updated this task
        db.add(TaskNoteLink(task_id=task.id, note_id=note.id, link_type="updated"))
        updated.append(TaskOut.model_validate(task))

    db.commit()  # single commit — all-or-nothing
    return ConfirmAllResponse(note_id=note.id, created=created, updated=updated)


@router.post("/confirm", response_model=ConfirmResponse)
def confirm_updates(payload: ConfirmRequest, db: Session = Depends(get_db)):
    """Purpose: Apply confirmed updates to existing tasks.

    Rejects edits to Done tasks (403) and past due-dates (422).
    When note_id is supplied, writes TaskNoteLink audit rows.

    Inputs: A ConfirmRequest with the selected task updates, an optional
            note_id, and the database session.

    Outputs: A ConfirmResponse containing the updated task records.

    Example: POST /api/extract/confirm with {approved: [...], note_id: 5}
    """
    updated: list[TaskOut] = []

    for approved in payload.approved:
        task = db.query(Task).filter(Task.id == approved.task_id).first()
        if not task:
            continue

        # Done tasks are read-only
        if task.status == StatusEnum.done:
            raise HTTPException(
                status_code=403,
                detail=(
                    f'Task "{task.description[:60]}" is marked as Done and is read-only. '
                    "Re-open it by changing its status first."
                ),
            )

        for field, value in approved.changes.items():
            if hasattr(task, field):
                setattr(task, field, value)

        # Write the note-link audit row if the caller gave us a note reference
        if payload.note_id:
            db.add(
                TaskNoteLink(
                    task_id=task.id,
                    note_id=payload.note_id,
                    link_type="updated",
                )
            )

        db.flush()
        db.refresh(task)
        updated.append(TaskOut.model_validate(task))

    db.commit()
    return ConfirmResponse(updated=updated)
