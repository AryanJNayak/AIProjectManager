import axios from 'axios';
import type {
  ConfirmAllResponse,
  ExtractionResponse,
  NoteEntry,
  NoteLink,
  ProposedNewTask,
  ProposedUpdate,
  Task,
  TaskDraft,
  TaskPriority,
  TaskStatus,
} from '../types/task';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeout: 30000,
});

// ---------------------------------------------------------------------------
// Key-conversion helpers
// ---------------------------------------------------------------------------

function taskDraftToSnakeCase(updates: TaskDraft): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (updates.dueDate !== undefined) result.due_date = updates.dueDate || null;
  if (updates.owner !== undefined) result.owner = updates.owner || null;
  if (updates.priority !== undefined) result.priority = updates.priority;
  if (updates.status !== undefined) result.status = updates.status;
  return result;
}

function normalizeExtractionResponse(raw: Record<string, unknown>): ExtractionResponse {
  const mapNew = (t: Record<string, unknown>): ProposedNewTask => ({
    description: t.description as string,
    dueDate: (t.dueDate ?? t.due_date) as string | undefined,
    owner: t.owner as string | undefined,
    priority: (t.priority ?? 'Medium') as TaskPriority,
  });
  const mapUpdate = (u: Record<string, unknown>): ProposedUpdate => ({
    taskId: (u.taskId ?? u.task_id) as number,
    description: u.description as string,
    current: (u.current ?? {}) as Record<string, unknown>,
    changes: (u.changes ?? {}) as Record<string, unknown>,
  });
  return {
    noteText: (raw.noteText ?? raw.note_text ?? '') as string,
    structuredNew: ((raw.structuredNew ?? raw.structured_new ?? []) as Array<Record<string, unknown>>).map(mapNew),
    unstructuredNew: ((raw.unstructuredNew ?? raw.unstructured_new ?? []) as Array<Record<string, unknown>>).map(mapNew),
    proposedUpdates: ((raw.proposedUpdates ?? raw.proposed_updates ?? []) as Array<Record<string, unknown>>).map(mapUpdate),
  };
}

// ---------------------------------------------------------------------------
// Mock fallbacks
// ---------------------------------------------------------------------------

const mockTasks: Task[] = [];
const mockNotes: NoteEntry[] = [];

function buildMockExtraction(text: string): ExtractionResponse {
  const normalized = text.toLowerCase();
  const structuredNew: ProposedNewTask[] = [];
  const unstructuredNew: ProposedNewTask[] = [];
  if (normalized.includes('launch') || normalized.includes('release')) {
    structuredNew.push({ description: 'Launch readiness review.', dueDate: '2026-07-14', owner: 'Lina', priority: 'High' });
  }
  if (normalized.includes('budget') || normalized.includes('finance')) {
    unstructuredNew.push({ description: 'Finance review.', priority: 'Medium' });
  }
  return { noteText: text, structuredNew, unstructuredNew, proposedUpdates: [] };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTasks(): Promise<Task[]> {
  try {
    return (await apiClient.get<Task[]>('/tasks')).data;
  } catch { return mockTasks; }
}

export async function getNotesHistory(): Promise<NoteEntry[]> {
  try {
    return (await apiClient.get<NoteEntry[]>('/notes')).data;
  } catch { return mockNotes; }
}

export async function getTaskNotes(taskId: number): Promise<NoteLink[]> {
  try {
    return (await apiClient.get<NoteLink[]>(`/tasks/${taskId}/notes`)).data;
  } catch { return []; }
}

/** POST /api/extract — LLM preview. Nothing is saved until confirmAll(). */
export async function extractTasksFromNotes(text: string): Promise<ExtractionResponse> {
  try {
    const response = await apiClient.post<Record<string, unknown>>('/extract', { text });
    return normalizeExtractionResponse(response.data);
  } catch { return buildMockExtraction(text); }
}

/** POST /api/extract/confirm-all — save note + tasks + apply updates atomically.
 *  Re-throws 409 (duplicate note) so the caller can surface the error. */
export async function confirmAll(payload: {
  noteText: string;
  tasksToCreate: Array<{ description: string; dueDate?: string | null; owner?: string | null; priority: TaskPriority; status: TaskStatus }>;
  approvedUpdates?: Array<{ taskId: number; changes: Record<string, unknown> }>;
}): Promise<ConfirmAllResponse> {
  const body = {
    note_text: payload.noteText,
    tasks_to_create: payload.tasksToCreate.map(t => ({
      description: t.description,
      due_date: t.dueDate || null,
      owner: t.owner || null,
      priority: t.priority,
      status: t.status,
    })),
    approved_updates: (payload.approvedUpdates ?? []).map(u => ({
      task_id: u.taskId,
      changes: u.changes,
    })),
  };
  try {
    return (await apiClient.post<ConfirmAllResponse>('/extract/confirm-all', body)).data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) throw err; // re-throw HTTP errors (409 etc.)
    const now = new Date().toISOString();
    return {
      created: payload.tasksToCreate.map((t, i) => ({
        id: Date.now() + i, description: t.description,
        owner: t.owner ?? undefined, priority: t.priority, status: t.status,
        dueDate: t.dueDate ?? undefined, createdAt: now, updatedAt: now,
      })),
      updated: [],
    };
  }
}

/** POST /api/extract/confirm — apply updates to existing tasks only.
 *  noteId should be the ID returned by the preceding confirmAll() call so the
 *  backend can write TaskNoteLink audit rows for every approved update. */
export async function confirmUpdates(
  approved: { taskId: number; changes: Record<string, unknown> }[],
  noteId?: number,
): Promise<Task[]> {
  const body = {
    approved: approved.map(a => ({ task_id: a.taskId, changes: a.changes })),
    note_id: noteId ?? null,
  };
  try {
    return (await apiClient.post<{ updated: Task[] }>('/extract/confirm', body)).data.updated;
  } catch {
    return approved.map(a => ({ id: a.taskId, ...a.changes, updatedAt: new Date().toISOString() } as Task));
  }
}

/** PATCH /api/tasks/{id} — apply a TaskDraft to the database. */
export async function updateTask(taskId: number, updates: TaskDraft): Promise<Task> {
  const payload = taskDraftToSnakeCase(updates);
  return (await apiClient.patch<Task>(`/tasks/${taskId}`, payload)).data;
}
