import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { extractTasksFromNotes, getTasks, updateTask } from "./api/tasksApi";
import { NoteComposer } from "./components/NoteComposer";
import { TaskBoard } from "./components/TaskBoard";
import { TaskFilters } from "./components/TaskFilters";
import type {
  ExtractionResponse,
  Task,
  TaskFilters as TaskFiltersType,
  TaskPriority,
  TaskStatus,
} from "./types/task";

function App() {
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFiltersType>({
    owner: "",
    status: "All",
    priority: "All",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState("");

  useEffect(() => {
    const loadTasks = async () => {
      const response = await getTasks();
      setTasks(response);
    };

    void loadTasks();
  }, []);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const ownerMatch =
        filters.owner.trim().length === 0 ||
        task.owner.toLowerCase().includes(filters.owner.toLowerCase());
      const statusMatch =
        filters.status === "All" || task.status === filters.status;
      const priorityMatch =
        filters.priority === "All" || task.priority === filters.priority;
      return ownerMatch && statusMatch && priorityMatch;
    });
  }, [filters, tasks]);

  const handleExtract = async () => {
    if (!notes.trim()) {
      setInsight(
        "Add a few notes first so the assistant has something to analyze.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const response: ExtractionResponse = await extractTasksFromNotes(notes);
      setTasks((current) => [...response.created, ...current]);
      setInsight(
        response.created.length > 0
          ? `Captured ${response.created.length} new task${response.created.length > 1 ? "s" : ""} and found ${response.proposedUpdates.length} update suggestion${response.proposedUpdates.length > 1 ? "s" : ""}.`
          : "No new tasks were extracted. Review the updates suggestions and refine the notes if needed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    const updatedTask = await updateTask(task.id, { status });
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? updatedTask : item)),
    );
  };

  const handlePriorityChange = async (task: Task, priority: TaskPriority) => {
    const updatedTask = await updateTask(task.id, { priority });
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? updatedTask : item)),
    );
  };

  return (
    <div className="dashboard-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Modern PM workspace</p>
          <h1>Turn discussions into clear execution plans.</h1>
          <p className="hero-copy">
            Guide your team with AI-assisted extraction, live task tracking, and
            focused delivery views.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>
              {tasks.filter((task) => task.status !== "Done").length}
            </strong>
            <span>Open tasks</span>
          </div>
          <div>
            <strong>
              {tasks.filter((task) => task.priority === "High").length}
            </strong>
            <span>High priority</span>
          </div>
        </div>
      </header>

      <div className="content-grid">
        <NoteComposer
          value={notes}
          onChange={setNotes}
          onExtract={handleExtract}
          isLoading={isLoading}
        />
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      {insight ? <div className="insight-card">{insight}</div> : null}

      <TaskBoard
        tasks={visibleTasks}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
      />
    </div>
  );
}

export default App;
