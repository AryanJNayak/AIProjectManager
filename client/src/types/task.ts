export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: number;
  description: string;
  owner: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  owner: string;
  status: TaskStatus | 'All';
  priority: TaskPriority | 'All';
}

export interface ProposedUpdate {
  taskId: number;
  description: string;
  current: Partial<Pick<Task, 'priority' | 'dueDate' | 'owner'>>;
  changes: Partial<Pick<Task, 'priority' | 'dueDate' | 'owner'>>;
}

export interface ExtractionResponse {
  created: Task[];
  proposedUpdates: ProposedUpdate[];
}

// A single raw note submission -- shown in the "Notes" history view
export interface NoteEntry {
  id: number;
  rawText: string;
  createdAt: string;
  taskCount: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState<T> {
  key: keyof T | null;
  direction: SortDirection;
}
