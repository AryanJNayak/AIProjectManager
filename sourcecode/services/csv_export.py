import io
from typing import List

import pandas as pd

from sourcecode.models.task import Task


def tasks_to_csv(tasks: List[Task]) -> io.StringIO:
    rows = [
        {
            "id": t.id,
            "description": t.description,
            "due_date": t.due_date.isoformat() if t.due_date else "",
            "owner": t.owner or "",
            "priority": t.priority.value if t.priority else "",
            "status": t.status.value if t.status else "",
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        }
        for t in tasks
    ]
    df = pd.DataFrame(rows)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return buf
