# Backend — Mini AI Project Manager Assistant

FastAPI + SQLAlchemy + MySQL + LangChain (Claude).

## Setup

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# then edit .env with your real DATABASE_URL and ANTHROPIC_API_KEY
```

## Run

```powershell
uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

Tables are created automatically on startup via `Base.metadata.create_all()` —
no migration step needed for the MVP. Just make sure the `mini_pm_assistant`
database already exists in MySQL (see the Installation & Setup Guide, Section 1.3).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/extract` | Extract tasks from raw notes; new tasks inserted, updates proposed as diffs |
| POST | `/api/extract/confirm` | Apply approved update diffs |
| GET | `/api/tasks` | List tasks, filterable by `owner`, `status`, `priority` |
| GET | `/api/tasks/{id}` | Get one task |
| PATCH | `/api/tasks/{id}` | Edit a task directly |
| DELETE | `/api/tasks/{id}` | Delete a task |
| GET | `/api/tasks/export` | Download filtered tasks as CSV |

## Try it

```powershell
curl -X POST http://localhost:8000/api/extract `
  -H "Content-Type: application/json" `
  -d "{\"text\": \"Sarah needs to prepare the Q3 sales report by next Friday, high priority. John should review the budget urgently.\"}"
```
