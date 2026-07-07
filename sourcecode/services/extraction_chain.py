from datetime import date
from typing import List, Dict, Any

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import OutputFixingParser
from langchain_core.exceptions import OutputParserException

from sourcecode.config import settings
from sourcecode.schemas.task_schema import ExtractionResult

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
- "update": this clearly refers to one of the candidate tasks (same underlying work,
  just a changed detail like priority/due date/owner) -> return existing_task_id,
  matched_on (brief reason), and changes (ONLY the fields that differ).

Rules:
- Resolve relative dates ("next Friday", "end of week") into YYYY-MM-DD using today's date.
- due_date is null if no date is mentioned or inferable.
- owner is null if not mentioned (for "new" items).
- priority is one of High/Medium/Low; infer from urgency language, default Medium.
- Only mark something "update" if you are reasonably confident it's the same task as a
  candidate -- when in doubt, prefer "new" (a false "update" match is worse than a
  duplicate, since the PM confirms updates before they sourcecodely).
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
    if not candidates:
        return "(none)"
    lines = [
        f"- id={c['id']}, description={c['description']!r}, owner={c.get('owner')!r}"
        for c in candidates
    ]
    return "\n".join(lines)


def build_chain():
    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=settings.ANTHROPIC_API_KEY,
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
    """
    Runs the extraction chain. On a validation failure from the structured
    parser, retries once with an explicit correction prompt (a lightweight
    stand-in for OutputFixingParser, since with_structured_output already
    handles most schema coercion under the hood).
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
