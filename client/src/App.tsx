import { useEffect, useMemo, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { TaskTable } from "./components/TaskTable";
import { NotesHistory } from "./components/NotesHistory";
import { NoteComposer } from "./components/NoteComposer";
import { UpdateConfirmationModal } from "./components/UpdateConfirmationModal";
import {
  getNotesHistory,
  getTasks,
  updateTask,
  extractTasksFromNotes,
  confirmUpdates,
} from "./api/tasksApi";
import type {
  NoteEntry,
  ProposedUpdate,
  Task,
  TaskPriority,
  TaskStatus,
} from "./types/task";

export default function App() {
  const [view, setView] = useState<View>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [search, setSearch] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<ProposedUpdate[]>([]);

  useEffect(() => {
    getTasks().then(setTasks);
    getNotesHistory().then(setNotes);
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.description, task.owner]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    );
  }, [tasks, search]);

  const datedTasks = filteredTasks.filter((t) => t.dueDate);
  const undatedTasks = filteredTasks.filter((t) => !t.dueDate);

  const applyTaskUpdate = async (task: Task, updates: Partial<Task>) => {
    const optimistic = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));
    const saved = await updateTask(task.id, updates);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
  };

  const handleStatusChange = (task: Task, status: TaskStatus) =>
    applyTaskUpdate(task, { status });

  const handlePriorityChange = (task: Task, priority: TaskPriority) =>
    applyTaskUpdate(task, { priority });

  const handleExtract = async () => {
    if (!noteText.trim()) return;
    setIsExtracting(true);
    try {
      const result = await extractTasksFromNotes(noteText);
      if (result.created.length) {
        setTasks((prev) => [...result.created, ...prev]);
      }
      if (result.proposedUpdates.length) {
        setPendingUpdates((prev) => [...result.proposedUpdates, ...prev]);
      }
      setNotes((prev) => [
        {
          id: Date.now(),
          rawText: noteText,
          createdAt: new Date().toISOString(),
          taskCount: result.created.length + result.proposedUpdates.length,
        },
        ...prev,
      ]);
      setNoteText("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmUpdates = async (approved: ProposedUpdate[]) => {
    const updated = await confirmUpdates(
      approved.map((u) => ({ taskId: u.taskId, changes: u.changes })),
    );
    setTasks((prev) =>
      prev.map((t) => updated.find((u) => u.id === t.id) ?? t),
    );
    setPendingUpdates((prev) =>
      prev.filter((u) => !approved.some((a) => a.taskId === u.taskId)),
    );
  };

  const dismissPendingUpdates = () => setPendingUpdates([]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar
        active={view}
        onNavigate={setView}
        taskCount={tasks.length}
        noteCount={notes.length}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              {view === "tasks" ? "Tasks" : "Notes history"}
            </h1>
            <p className="text-xs text-slate-500">
              {view === "tasks"
                ? "Grouped by whether a due date has been set"
                : "Every note that has been run through extraction"}
            </p>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {view === "tasks" ? (
            <>
              <NoteComposer
                value={noteText}
                onChange={setNoteText}
                onExtract={handleExtract}
                isLoading={isExtracting}
              />

              <CollapsibleSection
                title="Structured"
                subtitle="Tasks with a proper data"
                count={datedTasks.length}
                defaultOpen
              >
                <TaskTable
                  tasks={datedTasks}
                  showDueDate
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Unstructured"
                subtitle="Tasks without a proper data"
                count={undatedTasks.length}
                defaultOpen={false}
              >
                <TaskTable
                  tasks={undatedTasks}
                  showDueDate={false}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                />
              </CollapsibleSection>
            </>
          ) : (
            <NotesHistory
              notes={notes.filter((n) =>
                n.rawText.toLowerCase().includes(search.trim().toLowerCase()),
              )}
            />
          )}
        </main>
      </div>

      {pendingUpdates.length > 0 && (
        <UpdateConfirmationModal
          proposedUpdates={pendingUpdates}
          onConfirm={handleConfirmUpdates}
          onDismiss={dismissPendingUpdates}
        />
      )}
    </div>
  );
}
