import io
from typing import List, Mapping

import pandas as pd

from models.task import Task


CSV_COLUMNS = [
    "Description",
    "Due date",
    "Owner",
    "Priority",
    "Status",
    "Starting Project Date",
]


def task_export_rows(tasks: List[Task]) -> List[dict[str, str]]:
    return [
        {
            "Description": t.description,
            "Due date": t.due_date.isoformat() if t.due_date else "",
            "Owner": t.owner or "",
            "Priority": t.priority.value if t.priority else "",
            "Status": t.status.value if t.status else "",
            "Starting Project Date": t.created_at.isoformat() if t.created_at else "",
        }
        for t in tasks
    ]


def tasks_to_csv(tasks: List[Task]) -> io.StringIO:
    """Purpose: Convert a list of tasks into CSV content for export."""
    rows = task_export_rows(tasks)
    df = pd.DataFrame(rows, columns=CSV_COLUMNS)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return buf


def tasks_to_excel(tables: Mapping[str, List[Task]]) -> io.BytesIO:
    """Purpose: Convert multiple task tables into an Excel workbook."""
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        for sheet_name, tasks in tables.items():
            df = pd.DataFrame(task_export_rows(tasks), columns=CSV_COLUMNS)
            df.to_excel(writer, index=False, sheet_name=sheet_name[:31])
    buf.seek(0)
    return buf
