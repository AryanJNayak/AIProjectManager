import axios from 'axios';
import type { ExtractionResponse, NoteEntry, Task } from '../types/task';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeout: 10000,
});

const mockTasks: Task[] = [
  
];

const mockNotes: NoteEntry[] = [
  
];

function buildMockExtraction(text: string): ExtractionResponse {
  const normalized = text.toLowerCase();
  const created: Task[] = [];
  const now = new Date().toISOString();

  if (normalized.includes('launch') || normalized.includes('release')) {
    created.push({
      id: Date.now(),
      title: 'Launch readiness review',
      description: 'Capture the release follow-ups from the latest notes.',
      owner: 'Lina',
      priority: 'High',
      status: 'To Do',
      dueDate: '2026-07-14',
      source: 'AI extraction',
      createdAt: now,
      updatedAt: now,
    });
  }
  if (normalized.includes('budget') || normalized.includes('finance')) {
    created.push({
      id: Date.now() + 1,
      title: 'Finance review',
      description: 'Track the financial follow-up requested in the notes.',
      owner: 'Noah',
      priority: 'Medium',
      status: 'To Do',
      dueDate: '2026-07-16',
      source: 'AI extraction',
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
    const response = await apiClient.post<ExtractionResponse>('/extract', { text });
    return response.data;
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
    // Best-effort local fallback: merge the changes in directly so the UI still responds.
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
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, updates);
    return response.data;
  } catch {
    const now = new Date().toISOString();
    return {
      id: taskId,
      title: 'Updated task',
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
