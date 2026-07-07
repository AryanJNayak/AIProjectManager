from typing import List, Dict, Any

from rapidfuzz import fuzz

SIMILARITY_THRESHOLD = 50  # 0-100 scale; tune based on real usage


def find_candidate_tasks(
    raw_text: str, open_tasks: List[Dict[str, Any]], threshold: int = SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """Purpose: Pre-filter open tasks that likely match a raw note before calling the LLM.

    Inputs: The raw note text, a list of open tasks, and an optional similarity threshold.

    Outputs: A sorted list of candidate tasks that are likely related to the note.

    Example: find_candidate_tasks("Fix the onboarding flow", open_tasks)
    """
    candidates = []
    for task in open_tasks:
        desc_score = fuzz.partial_ratio(raw_text.lower(), task["description"].lower())
        owner_score = 0
        if task.get("owner"):
            owner_score = fuzz.partial_ratio(raw_text.lower(), task["owner"].lower())

        score = max(desc_score, owner_score)
        if score >= threshold:
            candidates.append({**task, "match_score": score})

    # Highest-scoring candidates first -- keeps the prompt focused if we later
    # decide to cap the number of candidates sent to the LLM.
    candidates.sort(key=lambda t: t["match_score"], reverse=True)
    return candidates
