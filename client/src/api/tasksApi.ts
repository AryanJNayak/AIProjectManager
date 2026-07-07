import axios from 'axios';
import type { ExtractionResponse, Task } from '../types/task';

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
  },
];

function buildMockExtraction(text: string): ExtractionResponse {
  const normalized = text.toLowerCase();
  const created: Task[] = [];

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

export async function extractTasksFromNotes(text: string): Promise<ExtractionResponse> {
  try {
    const response = await apiClient.post<ExtractionResponse>('/extract', { text });
    return response.data;
  } catch {
    return buildMockExtraction(text);
  }
}

export async function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  try {
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, updates);
    return response.data;
  } catch {
    return {
      id: taskId,
      title: 'Updated task',
      description: 'Locally updated in the UI.',
      owner: 'Unassigned',
      priority: 'Medium',
      status: 'To Do',
      ...updates,
    } as Task;
  }
}
