# Mini AI Project Manager Assistant

A smart project management assistant that turns raw meeting notes into structured tasks, detects whether a note refers to a new task or an update to an existing one, and lets the user review and approve changes before they are saved.

## Demo Video

[![Watch the demo](https://drive.google.com/uc?export=view&id=1-Lwi9tS5t37_fU4HZN-pmO30i1kNlTrr)](https://drive.google.com/file/d/1GhVG7Z5D5hMqgfXexZ42KPx9ZBablEBG/view?usp=sharing)

## Project Description

This application combines a React frontend, a FastAPI backend, and an LLM-powered extraction pipeline to help teams convert unstructured conversations into actionable project tasks.

It is designed for workflows such as:
- capturing meeting notes or backlog ideas,
- extracting tasks with priorities, owners, and deadlines,
- identifying possible updates to existing tasks,
- reviewing changes before committing them to the database.

## Key Features

- Accepts unstructured notes as input.
- Extracts task suggestions using an LLM.
- Uses retrieval-based context matching to compare new notes against existing tasks.
- Supports user confirmation before saving changes.
- Stores tasks and notes in a MySQL database.
- Provides a modern web UI for task review and management.
- Supports task export to CSV.

## Architecture Overview

This project uses a simple RAG-style workflow with FastAPI and an LLM:

```text
User Input (Notes) -> React + Vite UI -> FastAPI API
                                  -> Retrieve relevant existing tasks
                                  -> Build prompt with context
                                  -> LLM extracts/updates tasks
                                  -> User confirms edits
                                  -> SQLAlchemy + MySQL stores the result
```

### How the architecture works

- Frontend: React + Vite + TypeScript provides the interactive workspace.
- Backend: FastAPI exposes REST endpoints for extraction, confirmation, task CRUD, notes, and export.
- Retrieval layer: the app searches existing tasks using fuzzy matching to provide relevant context before calling the LLM.
- LLM layer: LangChain and an LLM model structure the extracted output into task objects.
- Data layer: SQLAlchemy connects the app to a MySQL database.

## Requirements Before You Start

Make sure the following tools are installed on Windows:

- Python 3.12.x
- Node.js 20.x or 22.x
- npm 10.x or newer
- MySQL Server 8.0.x
- MySQL Workbench 8.x (recommended for database management)
- Git
- A valid LLM API key such as a Google Gemini key

## Windows Setup Commands

### 1. Clone the repository

```powershell
git clone https://github.com/AryanJNayak/AIProjectManager.git
cd "AI Project Manager"
```

### 2. Create a Python virtual environment

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

### 3. Install Python dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create the MySQL database

Open MySQL Workbench or MySQL CLI and run:

```sql
CREATE DATABASE mini_pm_assistant;
```

### 5. Create the environment file

Create a file named `.env` in the project root and add:

```env
DATABASE_URL=mysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/mini_pm_assistant
GOOGLE_API_KEY=YOUR_LLM_API_KEY
CORS_ORIGINS=http://localhost:5173
```

> Replace `root` and `YOUR_MYSQL_PASSWORD` with your actual MySQL credentials.

### 6. Start the backend (FastAPI)

```powershell
AI Project Manager> python sourcecode/main.py
```

### 7. Install frontend dependencies

```powershell
AI Project Manager> cd client
AI Project Manager\client> npm install
```

### 8. Start the frontend (React + Vite)

```powershell
AI Project Manager\client> npm run dev
```

Open the app in your browser at:

```text
http://localhost:5173
```

## Required Environment Variables

The application expects these values in the `.env` file:

- `DATABASE_URL` — MySQL connection string
- `GOOGLE_API_KEY` — API key for the LLM backend
- `CORS_ORIGINS` — allowed frontend origins, usually `http://localhost:5173`

## Project Structure

```text
AI Project Manager/
├── client/                      # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.js
├── sourcecode/                  # FastAPI backend
│   ├── api/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── config.py
│   └── main.py
├── requirements.txt
├── README.MD
└── .env
```

## Main Technologies

### Backend
- FastAPI
- Python 3.12
- SQLAlchemy
- Pydantic
- LangChain
- RapidFuzz
- MySQL
- Uvicorn

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- Axios

## API Overview

Main API routes include:
- `POST /api/extract` — extract tasks from notes and propose updates
- `POST /api/extract/confirm` — save approved task changes
- `GET /api/tasks` — list tasks
- `GET /api/notes` — list saved notes
- `GET /api/tasks/export` — export tasks as CSV

## Notes

- The backend uses a confirmation flow so users can review and edit extracted tasks before saving them.
- The retrieval layer helps reduce duplicate tasks by comparing new notes with already existing work items.

