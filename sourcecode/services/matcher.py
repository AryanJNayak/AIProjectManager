import re
from typing import List, Dict, Any

from rapidfuzz import fuzz

SIMILARITY_THRESHOLD = 50  # 0-100 scale; tune based on real usage


def _normalize(text: str) -> str:
    """Purpose: Lowercase and strip punctuation so special characters don't
    unfairly penalise fuzzy scores.

    Inputs: Raw text string.

    Outputs: Cleaned, lowercase string with punctuation replaced by spaces.

    Example: _normalize("Project 'ABC'!") -> "project  abc "
    """
    text = text.lower()
    # Replace all non-alphanumeric characters (quotes, apostrophes, hyphens …)
    # with a space so they don't break token boundaries.
    text = re.sub(r"[^\w\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def find_candidate_tasks(
    raw_text: str, open_tasks: List[Dict[str, Any]], threshold: int = SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """Purpose: Pre-filter open tasks that likely match a raw note before calling the LLM.

    Inputs: The raw note text, a list of open tasks, and an optional similarity threshold.

    Outputs: A sorted list of candidate tasks that are likely related to the note.

    Strategy: Three complementary RapidFuzz algorithms are combined so that
    rephrasing, extra words, apostrophes, and word-order differences don't
    silently drop real candidates below the threshold:

      - partial_ratio       — substring containment (note contains task description)
      - token_set_ratio     — same tokens present regardless of order / extra words
      - token_sort_ratio    — handles re-ordered tokens (e.g. "ABC Project" vs "Project ABC")

    Example: find_candidate_tasks("The Project 'ABC' deadline is tomorrow", open_tasks)
    """
    note_norm = _normalize(raw_text)
    candidates = []

    for task in open_tasks:
        desc_norm = _normalize(task["description"])

        # All three ratios on the description; take the best
        desc_score = max(
            fuzz.partial_ratio(note_norm, desc_norm),
            fuzz.token_set_ratio(note_norm, desc_norm),   # best for same words in different order
            fuzz.token_sort_ratio(note_norm, desc_norm),  # handles rearranged + rephrased text
        )

        owner_score = 0
        if task.get("owner"):
            owner_norm = _normalize(task["owner"])
            owner_score = max(
                fuzz.partial_ratio(note_norm, owner_norm),
                fuzz.token_set_ratio(note_norm, owner_norm),
            )

        score = max(desc_score, owner_score)
        if score >= threshold:
            candidates.append({**task, "match_score": score})

    # Highest-scoring candidates first -- keeps the prompt focused if we later
    # decide to cap the number of candidates sent to the LLM.
    candidates.sort(key=lambda t: t["match_score"], reverse=True)
    return candidates
