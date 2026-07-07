import axios from 'axios';
import type { ExtractionResponse, NoteEntry, Task } from '../types/task';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeout: 10000,
});

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Prepare Q3 roadmap',
    description: 'Align leadership priorities and confirm milestones.',
    owner: 'Ava',
    priority: 'High',
    status: 'In Progress',
    dueDate: '2026-07-10',
    source: 'Meeting notes',
    createdAt: '2026-07-01T09:12:00Z',
    updatedAt: '2026-07-05T14:40:00Z',
  },
  {
    id: 2,
    title: 'Review client onboarding',
    description: 'Check handoff items and close the last blockers.',
    owner: 'Noah',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '2026-07-12',
    source: 'Weekly sync',
    createdAt: '2026-07-02T11:30:00Z',
    updatedAt: '2026-07-02T11:30:00Z',
  },
  {
    id: 3,
    title: 'Prepare launch checklist',
    description: 'Confirm release dependencies and training materials.',
    owner: 'Lina',
    priority: 'Low',
    status: 'Done',
    dueDate: '2026-07-05',
    source: 'Planning doc',
    createdAt: '2026-06-28T08:00:00Z',
    updatedAt: '2026-07-04T17:05:00Z',
  },
  {
    id: 4,
    title: 'Draft partner outreach email',
    description: 'No hard deadline yet -- waiting on legal sign-off.',
    owner: 'Ava',
    priority: 'Medium',
    status: 'To Do',
    source: 'Slack thread',
    createdAt: '2026-07-03T10:15:00Z',
    updatedAt: '2026-07-03T10:15:00Z',
  },
];

const mockNotes: NoteEntry[] = [
  {
    id: 1,
    rawText:
      "Sarah's Q3 report is now high priority, due next Monday. John needs to review the budget urgently.",
    createdAt: '2026-07-05T14:40:00Z',
    taskCount: 2,
  },
  {
    id: 2,
    rawText:
      'Team sync: Lina to finalize the launch checklist by Friday. No update needed on onboarding yet.',
    createdAt: '2026-07-04T17:05:00Z',
    taskCount: 1,
  },
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
