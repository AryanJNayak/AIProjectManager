import type { TaskFilters as TaskFiltersType, TaskPriority, TaskStatus } from '../types/task';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onChange: (filters: TaskFiltersType) => void;
}

const statuses: Array<TaskStatus | 'All'> = ['All', 'To Do', 'In Progress', 'Done'];
const priorities: Array<TaskPriority | 'All'> = ['All', 'High', 'Medium', 'Low'];

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  return (
    <div className="card card-stack">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">Workspace view</p>
          <h2>Track and focus your delivery</h2>
        </div>
      </div>
      <div className="filter-grid">
        <label className="field-label">
          Owner
          <input
            className="input"
            value={filters.owner}
            placeholder="Search owner"
            onChange={(event) => onChange({ ...filters, owner: event.target.value })}
          />
        </label>
        <label className="field-label">
          Status
          <select
            className="select"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as TaskFiltersType['status'] })}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Priority
          <select
            className="select"
            value={filters.priority}
            onChange={(event) => onChange({ ...filters, priority: event.target.value as TaskFiltersType['priority'] })}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
