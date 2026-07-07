# Mini AI Project Manager Assistant — Project Plan

## 1. Project Requirements

### 1.1 Problem Statement
Build a tool that helps project managers convert unstructured meeting notes or task descriptions into structured, actionable tasks — automatically inferring deadlines, owners, and priority — and manage them through a simple interface.

### 1.2 Functional Requirements

**Input**
- User pastes free-form meeting notes or task descriptions into a text area.

**AI Extraction (Backend)**
- Use an LLM to:
  - Extract discrete tasks from the raw text.
  - Infer due dates (relative dates like "next Friday" must be resolved to actual calendar dates).
  - Infer task owner (if a name/role is mentioned).
  - Infer/assign priority (High / Medium / Low) based on context and urgency language.
  - Return a structured JSON array of tasks.
- Persist extracted tasks to a database.

**Reconciliation (New vs. Update Detection)**
- Before extraction, fetch existing open tasks (status ≠ Done) as context for the LLM.
- LLM classifies each extracted item as `new` or `update` (matched against an existing task).
- `update` items only carry the *changed* fields (e.g., priority, due_date) — the rest of the existing task is left untouched.
- User is shown a confirmation diff for updates before they're committed (avoids silently overwriting the wrong task on a bad match).
- See **Section 2.4** and **Section 5.2** for full design and schema.

**Task Management (Frontend)**
- Display tasks in a list/table view.
- Filter tasks by owner, status, and priority.
- Edit task fields inline (description, due date, owner, priority, status).
- Delete tasks.
- Mark tasks as complete / change status (To Do, In Progress, Done).
- (Optional) Export task list to CSV.

### 1.3 Non-Functional Requirements
- Response time for extraction: ideally < 5–8 seconds for typical meeting-note-length input.
- Handle malformed/partial LLM output gracefully (validation + retry).
- Basic input size limits (e.g., max ~5,000 words per submission) to control LLM cost/latency.
- Simple, clean UI — no auth required for MVP (can be added later).

### 1.4 Out of Scope (MVP)
- Multi-user authentication / roles.
- Real-time collaboration.
- Integrations with external PM tools (Jira, Asana, Trello) — noted as a future enhancement.
- Notifications/reminders.

---

## 2. Architecture

### 2.1 High-Level Flow

```
┌─────────────┐  1. Paste notes            ┌───────────────┐
│   Frontend   │ ──────────────────────────▶│   Backend      │
│  (React JS)  │                            │  (FastAPI)     │
│              │◀────────────────────────── │                │
└─────────────┘  6. New tasks + update      └───────┬────────┘
                    diffs to confirm                │
                                        2. Fetch     │
                                        open tasks   ▼
                                             ┌────────────────┐
                                             │   Database      │
                                             │  (MySQL)        │
                                             └────────┬────────┘
                                                     │ 3. existing tasks
                                                     │    as context
                                                     ▼
                                             ┌────────────────┐
                                             │  LangChain      │
                                             │  Extraction     │
                                             │  Chain          │
                                             └────────┬────────┘
                                                     │ 4. Prompt
                                                     ▼
                                             ┌────────────────┐
                                             │   LLM API       │
                                             │ (Claude/OpenAI) │
                                             └────────┬────────┘
                                                     │ 5. Structured
                                                     │    new/update JSON
                                                     ▼
                                             ┌────────────────┐
                                             │   Database      │
                                             │  (MySQL,        │
                                             │   insert/patch) │
                                             └────────────────┘
```

### 2.2 Component Breakdown

| Layer | Responsibility |
|---|---|
| **Frontend (React JS)** | Text input form, task list/table, filters, inline edit, update-confirmation diff modal, CSV export button — data fetching via `axios` + `useState`/`useEffect` |
| **API Layer (FastAPI)** | Request validation, orchestrates extraction chain, CRUD endpoints for tasks |
| **Extraction Service (LangChain)** | Builds prompt via LangChain chain, injects existing-task context, calls LLM, parses/validates structured output (new vs. update) |
| **Database (MySQL)** | Stores tasks, source notes, metadata in relational tables |
| **LLM Provider** | Claude (Anthropic API) or OpenAI API — does the extraction/reasoning, wrapped by LangChain |

### 2.3 Extraction Pipeline (Detail)
1. Raw text received from frontend.
2. Backend fetches all **open tasks** (status ≠ Done) from the DB — just `id`, `description`, `owner` — to use as matching context.
3. A **LangChain chain** builds the prompt: raw note text + list of existing open tasks + output-schema instructions, and calls the LLM (via LangChain's model wrapper, e.g. `ChatAnthropic` or `ChatOpenAI`).
4. LangChain's structured-output parser (`with_structured_output`) enforces the JSON schema, classifying each item as `new` or `update`.
5. If validation fails → LangChain's built-in **retry parser** (`OutputFixingParser`) automatically re-prompts the LLM with the validation error, correcting malformed output without extra custom code.
6. Backend applies results:
   - `new` → INSERT into `tasks`.
   - `update` → matched against `existing_task_id`; only the changed fields are staged — **not applied yet**.
7. Response returned to frontend: newly created tasks are shown directly; proposed updates are shown as a **diff** (old value → new value) for the PM to confirm or reject before the `UPDATE` is committed.

### 2.4 Duplicate/Update Detection — Reconciliation Design

This directly addresses the "PM re-pastes a task that already exists, just with a changed priority/due date" case.

**Why not pure string/fuzzy matching alone?**
Wording varies a lot between mentions of the same task ("Sarah's Q3 report" vs. "prepare the Q3 sales report"). Fuzzy matching (e.g. `rapidfuzz`) is cheap but brittle on rewording. Letting the LLM (via the LangChain chain) do the semantic matching — using description + owner similarity — is more reliable.

**Cost-control middle ground:** pre-filter with fuzzy matching first (only pass tasks scoring above a similarity threshold, e.g. 50%, as "candidates") rather than sending the entire open-task backlog into every prompt. Keeps token usage low for PMs with large task lists.

**Matching flow:**
```
New text mentions "Q3 report" + owner "Sarah"
        │
        ▼
Candidate filter (rapidfuzz, threshold ~50%) narrows open tasks
        │
        ▼
LangChain chain sends candidates + new text to LLM
        │
        ▼
LLM returns: action="update", existing_task_id=17,
             changes={ "priority": "High", "due_date": "2026-07-13" }
        │
        ▼
Backend shows PM a confirmation diff → PM approves → UPDATE tasks SET ... WHERE id=17
```

**Safety rule:** New tasks (`action: "new"`) insert immediately since there's no overwrite risk. Updates always require PM confirmation in the MVP, since a wrong match would silently corrupt an existing task.

### 2.5 Suggested Repo Structure

```
mini-ai-pm-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint
│   │   ├── api/
│   │   │   ├── tasks.py               # CRUD routes
│   │   │   └── extract.py             # extraction + reconciliation route
│   │   ├── services/
│   │   │   ├── extraction_chain.py    # LangChain chain: prompt + LLM call + structured parser
│   │   │   ├── matcher.py             # fuzzy pre-filter (rapidfuzz) for candidate tasks
│   │   │   └── csv_export.py          # pandas-based CSV export
│   │   ├── models/
│   │   │   └── task.py                # SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── task_schema.py         # Pydantic schemas (incl. new/update LLM contract)
│   │   └── db/
│   │       └── database.py            # SQLAlchemy engine/session setup + create_all() call
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NoteInput.jsx
│   │   │   ├── TaskList.jsx
│   │   │   ├── TaskFilters.jsx
│   │   │   ├── TaskEditModal.jsx
│   │   │   └── UpdateDiffModal.jsx    # shows proposed update diffs for PM confirmation
│   │   ├── api/
│   │   │   └── client.js              # axios instance + API call wrappers
│   │   └── App.jsx
│   └── package.json
└── README.md
```

---

## 3. Tech Stack & Technologies

| Category | Choice | Rationale |
|---|---|---|
| **Backend framework** | FastAPI (Python) | Async, fast, native Pydantic validation, great for LLM-integrated APIs |
| **Orchestration** | **LangChain** | Handles prompt templating, structured-output parsing (`with_structured_output`), and automatic retry/self-correction (`OutputFixingParser`) for the extraction + reconciliation logic |
| **LLM Provider** | Anthropic Claude API (e.g., Claude Sonnet) or OpenAI GPT-4o | Strong structured-output / JSON reliability; both have first-class LangChain integrations |
| **Fuzzy pre-filter** | `rapidfuzz` | Cheap candidate-narrowing before handing possible matches to the LLM (cost control) |
| **Database** | MySQL | Relational, mature, widely supported; good fit for fixed-shape task data with owner/status/priority filtering |
| **DB Driver** | `mysqlclient` (or `PyMySQL` as a pure-Python fallback) | Connects SQLAlchemy to MySQL |
| **ORM** | SQLAlchemy | Python ORM; tables created directly via `Base.metadata.create_all()` at startup — no migration tool |
| **Validation** | Pydantic v2 | Schema validation for both API and LLM output; also used as LangChain's output schema |
| **Data handling** | pandas / DataFrame | CSV export, tabular transforms, filtering utilities server-side |
| **Frontend framework** | React (JavaScript, Vite) | Simple, fast dev experience, component-based UI |
| **UI styling** | Tailwind CSS (v4, via `@tailwindcss/vite`) | Rapid, consistent styling |
| **State/data fetching** | `axios` + React `useState`/`useEffect` | Simple, promise-based HTTP client for calling the FastAPI backend |
| **CSV Export** | `pandas` (backend, primary) / `papaparse` (frontend, optional) | Simple, reliable CSV generation |
| **Testing** | Pytest (backend), React Testing Library (frontend) | Unit + integration coverage |
| **Env/config management** | `.env` + `pydantic-settings` | Secure API key + connection string handling |

---

## 4. Tools and Technology Requirements

### 4.1 Development Tools
- Python 3.12
- Node.js 20 LTS / npm
- Git
- MySQL Server 8.4 (LTS) — see Installation Guide for setup

### 4.2 External Accounts / API Keys
- Anthropic API key (or OpenAI API key) — for LLM extraction calls
- (Optional) Cloud DB hosting (e.g., PlanetScale, AWS RDS, Railway) if deploying

### 4.3 Python Packages (backend/requirements.txt)
```
fastapi
uvicorn[standard]
sqlalchemy
mysqlclient          # or PyMySQL as a pure-Python alternative
pydantic
pydantic-settings
langchain
langchain-anthropic  # or langchain-openai
anthropic            # or openai (underlying SDK, used by LangChain wrapper)
rapidfuzz            # candidate pre-filtering for update matching
python-dotenv
pandas               # CSV export, tabular utilities
pytest
httpx                # for testing API calls
```
> No `alembic` — tables are created directly via `Base.metadata.create_all(engine)` when the app starts, rather than through a migration tool.
> If `mysqlclient` gives you install trouble on Windows (it needs MySQL's C libraries), use `PyMySQL` instead — it's pure Python and needs no compilation. Both work identically with SQLAlchemy; just change the connection string prefix (see Installation Guide).

### 4.4 Frontend Packages (package.json)
```
react
react-dom
vite
@vitejs/plugin-react
tailwindcss
@tailwindcss/vite
axios
papaparse
```
> Tailwind v4 uses a Vite plugin (`@tailwindcss/vite`) instead of a `tailwind.config.js` — see the Installation Guide for the two-step setup.

### 4.5 Deployment Considerations (Future)
- Backend: Render / Railway / Fly.io
- Frontend: Vercel / Netlify
- DB: Managed MySQL (PlanetScale, AWS RDS, Railway) — same SQLAlchemy models transfer over unchanged

---

## 5. API and Database Structure

### 5.1 Database Schema

**Table: `notes`** (optional — tracks each raw submission)
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| raw_text | TEXT | original pasted notes |
| created_at | TIMESTAMP | |

**Table: `tasks`**
| Column | Type | Notes |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| note_id | INT, FK → notes.id | nullable, links back to source note |
| description | TEXT | required |
| due_date | DATE | nullable |
| owner | VARCHAR(100) | nullable |
| priority | ENUM('High','Medium','Low') | default 'Medium' — MySQL supports native ENUM types |
| status | ENUM('To Do','In Progress','Done') | default 'To Do' |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP |

### 5.2 LLM Output JSON Schema (contract between LangChain chain and backend)

Each extracted item is tagged with an `action` — `new` or `update` — so the backend knows whether to `INSERT` or stage an `UPDATE`.

```json
{
  "tasks": [
    {
      "action": "new",
      "description": "Prepare Q3 sales report",
      "due_date": "2026-07-15",
      "owner": "Sarah",
      "priority": "High"
    },
    {
      "action": "update",
      "existing_task_id": 17,
      "matched_on": "description+owner similarity",
      "changes": {
        "priority": "High",
        "due_date": "2026-07-13"
      }
    }
  ]
}
```
- `due_date` must be normalized to `YYYY-MM-DD` (LLM resolves relative dates like "next Friday" using the current date passed in the prompt).
- `owner` is `null` if not mentioned (applies to `new` items).
- `priority` defaults to `"Medium"` if not inferable (applies to `new` items).
- For `update` items, `changes` only contains fields that actually differ from the existing task.
- This schema is enforced via a Pydantic model passed to LangChain's `with_structured_output()`; on validation failure, LangChain's `OutputFixingParser` re-prompts automatically before falling back to a manual error.

### 5.3 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/extract` | Accepts `{ "text": "..." }`. Runs the LangChain reconciliation chain. **New** tasks are inserted directly; **update** matches are returned as *proposed* diffs, not yet applied. |
| `POST` | `/api/extract/confirm` | Accepts a list of approved update proposals `{ "task_id", "changes" }[]` and applies them as `UPDATE`s. |
| `GET` | `/api/tasks` | List all tasks; supports query params `?owner=&status=&priority=` |
| `GET` | `/api/tasks/{id}` | Get single task |
| `PATCH` | `/api/tasks/{id}` | Edit task fields directly (description, due_date, owner, priority, status) |
| `DELETE` | `/api/tasks/{id}` | Delete a task |
| `GET` | `/api/tasks/export` | Returns CSV file (pandas-generated) of filtered/all tasks |

**Example: `POST /api/extract` request**
```json
{ "text": "Sarah's Q3 report is now high priority, due next Monday. John needs to review the budget urgently." }
```

**Example response** — mix of a new task and a proposed update requiring confirmation
```json
{
  "created": [
    {
      "id": 18,
      "description": "Review the budget",
      "due_date": null,
      "owner": "John",
      "priority": "High",
      "status": "To Do"
    }
  ],
  "proposed_updates": [
    {
      "task_id": 17,
      "description": "Prepare the Q3 report",
      "current": { "priority": "Medium", "due_date": "2026-07-17" },
      "changes": { "priority": "High", "due_date": "2026-07-13" }
    }
  ]
}
```

**Example: `POST /api/extract/confirm` request** — PM approves the diff shown above
```json
{
  "approved": [
    { "task_id": 17, "changes": { "priority": "High", "due_date": "2026-07-13" } }
  ]
}
```

**Example: `GET /api/tasks?owner=Sarah&priority=High`**
Returns filtered list matching query params.

---

## 6. Database Choice: MySQL

**Why MySQL fits well here:** the task data is a fixed, well-known shape (description, due_date, owner, priority, status), which is exactly what a relational table is built for. MySQL gives native `ENUM` types (so `priority`/`status` are validated at the database level, not just in application code), solid `WHERE`-clause filtering with indexes, and full ACID transactions — important for the new-vs-update reconciliation logic, where "find the matching task → conditionally update vs insert" needs to happen safely without race conditions.

**Compared to the other options considered earlier:**
- **vs. SQLite** — MySQL runs as a proper server process, so it handles concurrent writers (multiple PMs hitting the API at once) far better than SQLite's single-writer model.
- **vs. MongoDB** — since every task has the same fixed set of fields, MySQL's native `ENUM`/constraint enforcement and simple foreign key (`tasks.note_id → notes.id`) are a more natural fit than a schema-less document store.
- **vs. PostgreSQL** — functionally very similar for this project's needs; MySQL is a fine choice and is what's already available in your environment.

**Note on `updated_at`:** MySQL's `ON UPDATE CURRENT_TIMESTAMP` clause automatically bumps this column on every row update — useful for tracking when a task was last reconciled/edited, without needing to set it manually in application code.

---

## 7. Next Steps (Implementation Order)
1. Scaffold backend (FastAPI + DB models + migrations).
2. Build the LangChain extraction chain: prompt template + `with_structured_output` (new/update schema) + `OutputFixingParser` retry logic.
3. Build the `rapidfuzz` candidate pre-filter for matching against open tasks.
4. Build `/api/extract` (returns created tasks + proposed updates) and `/api/extract/confirm`.
5. Build task CRUD endpoints.
6. Scaffold frontend in plain React JS (note input form → calls `/api/extract` via `axios` → renders task list + update-diff confirmation modal).
7. Add filters, inline edit, delete, status change.
8. Add CSV export (pandas-backed).
9. Write basic tests (extraction/reconciliation validation, CRUD endpoints).
