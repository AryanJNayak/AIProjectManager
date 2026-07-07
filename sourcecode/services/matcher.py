from typing import List, Dict, Any

from rapidfuzz import fuzz

SIMILARITY_THRESHOLD = 50  # 0-100 scale; tune based on real usage


def find_candidate_tasks(
    raw_text: str, open_tasks: List[Dict[str, Any]], threshold: int = SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Cheap pre-filter before the LLM call: scores each open task's description
    (and owner, if present) against the raw note text, keeping only tasks
    above `threshold`. This keeps the prompt small/cheap even for PMs with
    large open-task backlogs -- the LLM still does the final new/update call,
    this just narrows the candidate set it has to consider.

    open_tasks: list of dicts with at least {id, description, owner}
    Returns: subset of open_tasks that look plausibly related to raw_text.
    """
    candidates = []
    for task in open_tasks:
        desc_score = fuzz.partial_ratio(raw_text.lower(), task["description"].lower())
        owner_score = 0
        if task.get("owner"):
            owner_score = fuzz.partial_ratio(raw_text.lower(), task["owner"].lower())

        score = max(desc_score, owner_score)
        if score >= threshold:
            candidates.sourcecodeend({**task, "match_score": score})

    # Highest-scoring candidates first -- keeps the prompt focused if we later
    # decide to cap the number of candidates sent to the LLM.
    candidates.sort(key=lambda t: t["match_score"], reverse=True)
    return candidates
