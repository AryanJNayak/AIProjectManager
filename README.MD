# Mini AI Project Manager Assistant

A lightweight project management assistant that converts raw meeting notes into structured tasks, detects whether notes update existing tasks, and lets the user confirm changes before they are saved.

[![Watch the demo](https://drive.google.com/uc?export=view&id=1-Lwi9tS5t37_fU4HZN-pmO30i1kNlTrr)](https://drive.google.com/file/d/1GhVG7Z5D5hMqgfXexZ42KPx9ZBablEBG/view?usp=sharing)

## Project Requirements

- Accept unstructured meeting notes or task descriptions as input.
- Extract discrete tasks with inferred owners, deadlines, and priorities.
- Detect whether a note refers to a new task or an existing one.
- When an existing task appears to be updated, show the proposed diff and ask the user to confirm before applying changes.
- Allow the user to edit extracted task fields before saving.
- Display task data in a list with filters and inline editing.
- Persist tasks and notes in a relational database.

## Current Implementation

### Backend
- Python + FastAPI backend in `sourcecode/`.
- Uses SQLAlchemy models to persist `Task` and `Note` entities to the database.
- Uses a LangChain extraction pipeline to convert free-form notes into structured task output.
- Pre-filters open tasks using `rapidfuzz` to identify candidate existing tasks before calling the LLM.
- The extraction endpoint returns:
  - `extracted` new task proposals that are not yet stored.
  - `proposedUpdates` for existing tasks that may need patching.
- The confirm endpoint applies only user-approved creations and updates.

### Frontend
- React + Vite frontend located in `client/`.
- Styled with Tailwind CSS.
- Provides a note composer for submitting raw meeting notes.
- Presents extracted tasks and proposed updates to the user for review.
- Displays task lists with inline editing and filtering.
- Uses `axios` to communicate with the FastAPI backend.

## Architecture

### High-Level Flow

1. User pastes meeting notes into the frontend.
2. Frontend posts the text to `/api/extract`.
3. Backend saves the raw note and fetches open tasks as matching context.
4. The extraction service builds a prompt with the note and candidate existing tasks.
5. The LLM returns structured task output classified as `new` or `update`.
6. The frontend asks the user to confirm or edit the extracted items.
7. The backend applies confirmed creations and updates via `/api/extract/confirm`.
8. Tasks are stored in the database and displayed in the UI.

### Component Breakdown

- `client/`
  - `src/App.tsx` — main application logic and extraction flow.
  - `src/api/tasksApi.ts` — API layer for fetching tasks, extracting notes, and confirming changes.
  - `src/components/` — reusable UI components for notes, tasks, sidebar, and tables.
- `sourcecode/`
  - `main.py` — FastAPI app startup and router registration.
  - `api/extract.py` — extraction + confirm routes.
  - `api/tasks.py` — task CRUD routes.
  - `api/notes.py` — note listing route.
  - `services/extraction_chain.py` — LangChain prompt + model pipeline.
  - `services/matcher.py` — fuzzy candidate selection for existing tasks.
  - `models/task.py` — SQLAlchemy `Task` and `Note` models.
  - `schemas/task_schema.py` — Pydantic schemas for validation and LLM contract.
  - `db/database.py` — database engine and session setup.
  - `config.py` — environment configuration.

## Technologies

### Backend
- FastAPI
- Python 3.12+
- SQLAlchemy
- Pydantic
- LangChain
- RapidFuzz
- MySQL (via SQLAlchemy)
- Uvicorn

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- TypeScript

### AI / Extraction
- LangChain structured output
- LLM provider via `GOOGLE_API_KEY` (or other supported model backends)
- Candidate task reconciliation with fuzzy matching

## Setup Commands

### 1. Install backend dependencies

From the repo root:

```bash
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file in the repo root with:

```env
DATABASE_URL=mysql://user:password@localhost/mini_pm_assistant
GOOGLE_API_KEY=your_api_key_here
CORS_ORIGINS=http://localhost:5173
```

### 3. Run the backend

```bash
python .\sourcecode\main.py
```

or with Uvicorn:

```bash
uvicorn sourcecode.main:app --reload
```

### 4. Install frontend dependencies

```bash
cd client
npm install
```

### 5. Run the frontend

```bash
npm run dev
```

Open the app at the address shown by Vite (typically `http://localhost:5173`).

## API Endpoints

| Method | Endpoint              | Purpose |
|---|---|---|
| POST | `/api/extract` | Extract tasks from raw notes and propose updates. |
| POST | `/api/extract/confirm` | Save confirmed new tasks and apply approved updates. |
| GET | `/api/tasks` | List tasks. |
| GET | `/api/tasks/{id}` | Retrieve a single task. |
| PATCH | `/api/tasks/{id}` | Update a task. |
| DELETE | `/api/tasks/{id}` | Delete a task. |
| GET | `/api/tasks/export` | Export tasks as CSV. |
| GET | `/api/notes` | List saved note submissions with task counts. |

## Notes

- The frontend currently uses a confirmation/edit flow for extracted tasks, so the user can review and modify extracted output before saving.
- The backend reconciles new notes against existing open tasks and avoids duplicate task creation by identifying updates to previous work.
