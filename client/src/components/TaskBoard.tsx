import type { Task, TaskPriority, TaskStatus } from "../types/task";

interface TaskBoardProps {
  tasks: Task[];
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onPriorityChange: (task: Task, priority: TaskPriority) => void;
}

const statuses: TaskStatus[] = ["To Do", "In Progress", "Done"];
const priorities: TaskPriority[] = ["High", "Medium", "Low"];

export function TaskBoard({
  tasks,
  onStatusChange,
  onPriorityChange,
}: TaskBoardProps) {
  return (
    <section className="card card-stack">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">Delivery board</p>
          <h2>Task overview</h2>
        </div>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <article key={task.id} className="task-card">
            <div className="task-card-top">
              <div>
                <h3>{task.description}</h3>
              </div>
              <span className={`pill ${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>
            </div>
            <div className="task-meta">
              <span>Owner: {task.owner}</span>
              <span>Due: {task.dueDate ?? "TBD"}</span>
            </div>
            <div className="task-controls">
              <label>
                Status
                <select
                  value={task.status}
                  onChange={(event) =>
                    onStatusChange(task, event.target.value as TaskStatus)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={task.priority}
                  onChange={(event) =>
                    onPriorityChange(task, event.target.value as TaskPriority)
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
