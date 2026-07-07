from datetime import date
from typing import List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.exceptions import OutputParserException

from config import settings
from schemas.task_schema import ExtractionResult

SYSTEM_PROMPT = """You are an assistant that turns a project manager's raw meeting notes
into structured tasks.

Today's date is: {today}

You will be given:
1. The raw note text.
2. A list of CANDIDATE existing open tasks (id, description, owner) that might be the
   same task as something mentioned in the notes, just being updated.

For every distinct task-like item you find in the notes, decide:
- "new": this is a task that doesn't match any candidate -> return description, due_date,
  owner, priority.
- "update": this refers to one of the candidate tasks -- the same underlying work with
  a changed detail (due date, priority, owner, or description) -> return existing_task_id,
  matched_on (brief reason), and changes (ONLY the fields that differ).

--- MATCHING SIGNALS (use these to choose update vs new) ---

Strong signals to choose "update":
  * The note and a candidate share the SAME project name, feature name, or task entity
    (e.g. both mention "Project ABC" -> almost certainly the same task).
  * The note is changing an attribute of work that already exists: a new date, a new owner,
    a new priority, or a correction.
  * Language like "updated", "moved", "changed", "now", "instead", "new deadline",
    "pushed to", "rescheduled" signals an update to existing work.
  * The note explicitly names an owner who is already associated with a candidate task.

Choose "new" ONLY when:
  * The note introduces genuinely new work not represented by any candidate.
  * No candidate shares a project name, person, or task entity with the note.

--- FEW-SHOT EXAMPLES ---

Example A -- deadline change -> UPDATE (not new):
  Candidate tasks: [id=5, description="Owner of Project ABC", owner="aryan naya"]
  Note: "The Project ABC deadline is tomorrow."
  Correct output: action=update, existing_task_id=5,
                  matched_on="same project name Project ABC",
                  changes={{"due_date": "<tomorrow YYYY-MM-DD>"}}
  WRONG: creating a new task called "Meet Project ABC deadline"

Example B -- genuinely new work -> NEW:
  Candidate tasks: [id=5, description="Owner of Project ABC", owner="aryan naya"]
  Note: "Need to set up the CI pipeline for the mobile app."
  Correct output: action=new, description="Set up CI pipeline for mobile app"

--- RULES ---
- Resolve relative dates ("next Friday", "today", "tomorrow", "end of week") into
  YYYY-MM-DD using today's date.
- due_date is null if no date is mentioned or inferable.
- owner is null if not mentioned (for "new" items).
- priority is one of High/Medium/Low; infer from urgency language, default Medium.
- Return ONLY the structured tasks list, nothing else.
"""

USER_PROMPT = """Raw notes:
\"\"\"
{raw_text}
\"\"\"

Candidate existing open tasks (id, description, owner):
{candidates}
"""


def _format_candidates(candidates: List[Dict[str, Any]]) -> str:
    """Purpose: Format candidate tasks into a string for the LLM prompt.

    Inputs: A list of candidate task dictionaries.

    Outputs: A newline-separated string suitable for prompt injection.

    Example: _format_candidates([{"id": 1, "description": "Write docs", "owner": "Ana"}])
    """
    if not candidates:
        return "(none)"
    lines = [
        f"- id={c['id']}, description={c['description']!r}, owner={c.get('owner')!r}"
        for c in candidates
    ]
    return "\n".join(lines)


def build_chain():
    """Purpose: Build the LangChain pipeline for structured task extraction.

    Inputs: None.

    Outputs: A runnable prompt-to-structured-output chain backed by the configured LLM.

    Example: chain = build_chain()
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(ExtractionResult)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("user", USER_PROMPT),
        ]
    )

    return prompt | structured_llm


def extract_tasks(raw_text: str, candidate_tasks: List[Dict[str, Any]]) -> ExtractionResult:
    """Purpose: Extract structured tasks from raw notes using the configured LLM chain.

    Inputs: The raw note text and a list of candidate existing tasks.

    Outputs: An ExtractionResult containing proposed new tasks and updates.

    Example: extract_tasks("Ship the onboarding doc by Friday", candidates)
    """
    chain = build_chain()
    inputs = {
        "today": date.today().isoformat(),
        "raw_text": raw_text,
        "candidates": _format_candidates(candidate_tasks),
    }

    try:
        result = chain.invoke(inputs)
    except OutputParserException:
        # Single retry: re-invoke once more before surfacing the error.
        # (with_structured_output + tool-calling models rarely need this,
        # but it's cheap insurance against a malformed first response.)
        result = chain.invoke(inputs)

    return result
