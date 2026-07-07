import axios from 'axios';
import type { ExtractionResponse, NoteEntry, Task } from '../types/task';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeout: 30000,
});

// ---------------------------------------------------------------------------
// Key conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Partial<Task> (camelCase frontend keys) to the snake_case payload
 * expected by the backend PATCH /api/tasks/{id} endpoint.
 */
function taskUpdatesToSnakeCase(updates: Partial<Task>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (updates.description !== undefined) result.description = updates.description;
  if (updates.dueDate !== undefined) result.due_date = updates.dueDate;
  if (updates.owner !== undefined) result.owner = updates.owner;
  if (updates.priority !== undefined) result.priority = updates.priority;
  if (updates.status !== undefined) result.status = updates.status;
  return result;
}

/**
 * Normalize the backend extract response to camelCase.
 * The backend now emits camelCase via serialization_alias, but we also guard
 * against older snake_case responses for resilience.
 */
function normalizeExtractionResponse(raw: Record<string, unknown>): ExtractionResponse {
  const created = (raw.created ?? []) as Task[];

  // Support both camelCase (aliased) and snake_case (legacy) response shapes
  const rawUpdates = (raw.proposedUpdates ?? raw.proposed_updates ?? []) as Array<
    Record<string, unknown>
  >;

  const proposedUpdates = rawUpdates.map((u) => ({
    taskId: (u.taskId ?? u.task_id) as number,
    description: u.description as string,
    current: (u.current ?? {}) as Record<string, unknown>,
    changes: (u.changes ?? {}) as Record<string, unknown>,
  }));

  return { created, proposedUpdates };
}

// ---------------------------------------------------------------------------
// Mock fallbacks (used when the backend is unreachable)
// ---------------------------------------------------------------------------

const mockTasks: Task[] = [];

const mockNotes: NoteEntry[] = [];

function buildMockExtraction(text: string): ExtractionResponse {
  const normalized = text.toLowerCase();
  const created: Task[] = [];
  const now = new Date().toISOString();

  if (normalized.includes('launch') || normalized.includes('release')) {
    created.push({
      id: Date.now(),
      description: 'Launch readiness review — capture the release follow-ups from the latest notes.',
      owner: 'Lina',
      priority: 'High',
      status: 'To Do',
      dueDate: '2026-07-14',
      source: 'AI extraction (mock)',
      createdAt: now,
      updatedAt: now,
    });
  }
  if (normalized.includes('budget') || normalized.includes('finance')) {
    created.push({
      id: Date.now() + 1,
      description: 'Finance review — track the financial follow-up requested in the notes.',
      owner: 'Noah',
      priority: 'Medium',
      status: 'To Do',
      dueDate: '2026-07-16',
      source: 'AI extraction (mock)',
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    created,
    proposedUpdates: [
      {
        taskId: 1,
        description: 'Prepare Q3 roadmap',
        current: { priority: 'Medium', dueDate: '2026-07-10' },
        changes: { priority: 'High', dueDate: '2026-07-11' },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTasks(): Promise<Task[]> {
  try {
    const response = await apiClient.get<Task[]>('/tasks');
    return response.data;
  } catch {
    return mockTasks;
  }
}

export async function getNotesHistory(): Promise<NoteEntry[]> {
  try {
    const response = await apiClient.get<NoteEntry[]>('/notes');
    return response.data;
  } catch {
    return mockNotes;
  }
}

export async function extractTasksFromNotes(text: string): Promise<ExtractionResponse> {
  try {
    const response = await apiClient.post<Record<string, unknown>>('/extract', { text });
    return normalizeExtractionResponse(response.data);
  } catch {
    return buildMockExtraction(text);
  }
}

export async function confirmUpdates(
  approved: { taskId: number; changes: Record<string, unknown> }[],
): Promise<Task[]> {
  const body = {
    approved: approved.map((a) => ({ task_id: a.taskId, changes: a.changes })),
  };
  try {
    const response = await apiClient.post<{ updated: Task[] }>('/extract/confirm', body);
    return response.data.updated;
  } catch {
    // Best-effort local fallback: merge the changes directly so the UI still responds.
    const now = new Date().toISOString();
    return approved.map((a) => ({
      id: a.taskId,
      ...a.changes,
      updatedAt: now,
    })) as Task[];
  }
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  try {
    // Convert frontend camelCase keys to the snake_case the backend expects
    const payload = taskUpdatesToSnakeCase(updates);
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, payload);
    return response.data;
  } catch {
    const now = new Date().toISOString();
    return {
      id: taskId,
      description: 'Locally updated in the UI.',
      owner: 'Unassigned',
      priority: 'Medium',
      status: 'To Do',
      createdAt: now,
      updatedAt: now,
      ...updates,
    } as Task;
  }
}
