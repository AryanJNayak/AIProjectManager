import type { Task, TaskPriority, TaskStatus } from '../types/task';
import { SortableHeader } from './SortableHeader';
import { useSortableData } from '../hooks/useSortableData';

interface TaskTableProps {
  tasks: Task[];
  showDueDate: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onPriorityChange: (task: Task, priority: TaskPriority) => void;
}

const statusOptions: TaskStatus[] = ['To Do', 'In Progress', 'Done'];
const priorityOptions: TaskPriority[] = ['High', 'Medium', 'Low'];

const priorityStyles: Record<TaskPriority, string> = {
  High: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  Medium: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  Low: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskTable({
  tasks,
  showDueDate,
  onStatusChange,
  onPriorityChange,
}: TaskTableProps) {
  const { sortedRows, sort, toggleSort } = useSortableData<Task>(tasks, 'updatedAt');

  if (tasks.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-slate-500">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <SortableHeader
              label="Task"
              active={sort.key === 'title'}
              direction={sort.direction}
              onClick={() => toggleSort('title')}
            />
            <SortableHeader
              label="Owner"
              active={sort.key === 'owner'}
              direction={sort.direction}
              onClick={() => toggleSort('owner')}
            />
            <SortableHeader
              label="Priority"
              active={sort.key === 'priority'}
              direction={sort.direction}
              onClick={() => toggleSort('priority')}
            />
            <SortableHeader
              label="Status"
              active={sort.key === 'status'}
              direction={sort.direction}
              onClick={() => toggleSort('status')}
            />
            {showDueDate && (
              <SortableHeader
                label="Due"
                active={sort.key === 'dueDate'}
                direction={sort.direction}
                onClick={() => toggleSort('dueDate')}
              />
            )}
            <SortableHeader
              label="Created"
              active={sort.key === 'createdAt'}
              direction={sort.direction}
              onClick={() => toggleSort('createdAt')}
            />
            <SortableHeader
              label="Updated"
              active={sort.key === 'updatedAt'}
              direction={sort.direction}
              onClick={() => toggleSort('updatedAt')}
            />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((task) => (
            <tr
              key={task.id}
              className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
            >
              <td className="max-w-xs px-4 py-3">
                <p className="truncate font-medium text-slate-100">{task.description}</p>
              </td>
              <td className="px-4 py-3 text-slate-300">{task.owner || '—'}</td>
              <td className="px-4 py-3">
                <select
                  value={task.priority}
                  onChange={(event) =>
                    onPriorityChange(task, event.target.value as TaskPriority)
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option} className="bg-slate-900 text-slate-100">
                      {option}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={task.status}
                  onChange={(event) =>
                    onStatusChange(task, event.target.value as TaskStatus)
                  }
                  className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option} className="bg-slate-900">
                      {option}
                    </option>
                  ))}
                </select>
              </td>
              {showDueDate && (
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-300">
                  {task.dueDate ?? '—'}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                {formatTimestamp(task.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                {formatTimestamp(task.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
