export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: number;
  description: string;
  owner?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Extraction types ----------

/** A new task from the LLM — not yet saved. Shown in the confirmation modal. */
export interface ProposedNewTask {
  description: string;
  dueDate?: string;      // missing = unstructured
  owner?: string;        // missing = unstructured
  priority: TaskPriority;
}

/** A proposed change to an existing saved task (PM must approve before it is applied). */
export interface ProposedUpdate {
  taskId: number;
  description: string;
  current: Record<string, unknown>;
  changes: Record<string, unknown>;
}

/** Shape returned by POST /api/extract — nothing is saved yet. */
export interface ExtractionResponse {
  noteText: string;
  structuredNew: ProposedNewTask[];    // have due_date AND owner
  unstructuredNew: ProposedNewTask[];  // missing due_date or owner
  proposedUpdates: ProposedUpdate[];   // changes to existing tasks
}

/** Shape returned by POST /api/extract/confirm-all */
export interface ConfirmAllResponse {
  noteId: number;   // ID of the saved note — passed back to confirmUpdates for audit linking
  created: Task[];
  updated: Task[];
}

// ---------- Task notes history ----------

/** A note that created or updated a task — returned by GET /api/tasks/{id}/notes. */
export interface NoteLink {
  noteId: number;
  noteText: string;
  linkType: 'created' | 'updated';
  createdAt: string;
}

// ---------- Notes ----------

export interface NoteEntry {
  id: number;
  rawText: string;
  createdAt: string;
  taskCount: number;
}

// ---------- Draft / save state ----------

/** In-memory per-row unsaved changes. Keys match Task field names. */
export type TaskDraft = Partial<Pick<Task, 'owner' | 'dueDate' | 'priority' | 'status'>>;

// ---------- Sorting ----------

export type SortDirection = 'asc' | 'desc';

export interface SortState<T> {
  key: keyof T | null;
  direction: SortDirection;
}
