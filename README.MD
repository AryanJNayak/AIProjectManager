## Mini AI Project Manager Assistant

This tool helps project managers convert unstructured meeting notes or task descriptions into structured, actionable tasks. It automatically infers deadlines, owners, and priority, and provides a simple interface to manage them.

---

## ✨ Features

### AI-Powered Task Extraction
- **Paste & Go**: Drop your raw meeting notes into a text area.
- **Smart Parsing**: An LLM (Claude/OpenAI) backend extracts discrete tasks.
- **Automatic Inference**: Automatically assigns due dates (resolving "next Friday"), owners, and priority (High/Medium/Low) from your text.

### Intelligent Reconciliation
- **Update Detection**: The AI intelligently detects if a new note is an update to an existing task, preventing duplicates.
- **Confirm Changes**: Proposed updates (e.g., a changed priority or due date) are shown as a clear "diff" for you to approve before they are applied.

### Simple Task Management
- **Unified View**: See all your tasks in a clean, filterable list.
- **Filters**: Quickly filter tasks by owner, status, or priority.
- **Inline Editing**: Click any field to edit a task's description, due date, owner, etc., directly in the list.
- **Status Tracking**: Move tasks between 'To Do', 'In Progress', and 'Done'.
- **Export**: Download your current task list as a CSV file.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v20 LTS or later)
- **Python** (v3.12 or later)
- **MySQL Server** (v8.4 or later)
- An **Anthropic or OpenAI API Key**

### 1. Backend Setup (FastAPI)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create a virtual environment and install dependencies:**
    ```bash
    python -m venv venv
    # On Windows
    .\venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate

    pip install -r requirements.txt
    ```
3.  **Configure environment variables:**
    - Create a `.env` file from the example: `copy .env.example .env` (Windows) or `cp .env.example .env` (macOS/Linux).
    - Edit the `.env` file to add your `DATABASE_URL` and `GOOGLE_API_KEY` (or `OPENAI_API_KEY`).
4.  **Database Setup:**
    - Ensure your MySQL server is running.
    - Create a database named `mini_pm_assistant`.
    - The tables will be created automatically when the application starts.
5.  **Run the backend server:**
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be live at `http://localhost:8000`.

### 2. Frontend Setup (React)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

---

## 🎨 Frontend Design Notes

The user interface is built with React and styled with Tailwind CSS for a clean and responsive experience.

- **Interactivity**: All clickable elements, such as buttons, links, and editable task fields, use `cursor: pointer` to provide clear visual feedback to the user.
- **Simplicity**: The design prioritizes ease of use, with a minimal layout that focuses on the core workflow: pasting notes and managing the resulting tasks.
- **Responsiveness**: The UI is designed to be usable across different screen sizes.

---

## 🛠️ API Endpoints

The backend provides the following RESTful endpoints that the frontend consumes.

| Method | Endpoint              | Description                                                              |
|--------|-----------------------|--------------------------------------------------------------------------|
| `POST` | `/api/extract`        | Accepts raw text and returns newly created tasks and proposed updates.   |
| `POST` | `/api/extract/confirm`| Applies a list of approved updates to existing tasks.                    |
| `GET` | `/api/tasks`          | Lists all tasks, with support for filtering.                             |
| `GET` | `/api/tasks/{id}`     | Retrieves a single task by its ID.                                       |
| `PATCH`| `/api/tasks/{id}`     | Edits a task's fields (e.g., status, priority).                          |
| `DELETE`| `/api/tasks/{id}`     | Deletes a task.                                                          |
| `GET` | `/api/tasks/export`   | Exports the current (and possibly filtered) list of tasks to a CSV file. |

You can explore the API interactively by visiting `http://localhost:8000/docs` while the backend is running.
