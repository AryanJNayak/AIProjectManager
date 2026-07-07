import axios from 'axios';
import { useEffect, useMemo, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { TaskTable } from "./components/TaskTable";
import { NotesHistory } from "./components/NotesHistory";
import { NoteComposer } from "./components/NoteComposer";
import { UpdateConfirmationModal } from "./components/UpdateConfirmationModal";
import { UnstructuredConfirmModal, type EditableTask } from "./components/UnstructuredConfirmModal";
import { ConfirmChangesDialog } from "./components/ConfirmChangesDialog";
import { TaskDetailModal } from "./components/TaskDetailModal";
import {
  getNotesHistory,
  getTaskNotes,
  getTasks,
  updateTask,
  extractTasksFromNotes,
  confirmAll,
  confirmUpdates,
} from "./api/tasksApi";
import type {
  ExtractionResponse,
  NoteEntry,
  NoteLink,
  ProposedUpdate,
  Task,
  TaskDraft,
  TaskPriority,
  TaskStatus,
} from "./types/task";

export default function App() {
  // ── View / data ──────────────────────────────────────────────────────────
  const [view, setView] = useState<View>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [search, setSearch] = useState("");

  // ── Note composer ─────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // ── Extraction confirmation flows ─────────────────────────────────────────
  // 1. Unstructured tasks → UnstructuredConfirmModal (nothing saved until Accept)
  const [pendingExtraction, setPendingExtraction] = useState<ExtractionResponse | null>(null);
  // 2. Proposed updates to existing tasks only → UpdateConfirmationModal
  const [pendingUpdates, setPendingUpdates] = useState<ProposedUpdate[]>([]);
  // The note ID from the confirm_all call that triggered these updates.
  // Forwarded to confirmUpdates so the backend can write TaskNoteLink rows.
  const [pendingUpdatesNoteId, setPendingUpdatesNoteId] = useState<number | null>(null);

  // ── Per-row draft changes (not yet saved to DB) ───────────────────────────
  const [rowDrafts, setRowDrafts] = useState<Record<number, TaskDraft>>({});
  // When a row's Save is clicked, queue it here to show ConfirmChangesDialog
  const [confirmRow, setConfirmRow] = useState<{ task: Task; draft: TaskDraft } | null>(null);
  const [isSavingRow, setIsSavingRow] = useState(false);

  // ── Task detail modal ─────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNoteLinks, setTaskNoteLinks] = useState<NoteLink[]>([]);
  const [isLoadingNoteLinks, setIsLoadingNoteLinks] = useState(false);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getTasks().then(setTasks);
    getNotesHistory().then(setNotes);
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t =>
      [t.description, t.owner].filter(Boolean).some(f => f!.toLowerCase().includes(q)),
    );
  }, [tasks, search]);

  // Bug 1 fix: Structured = has BOTH dueDate AND owner; otherwise Unstructured.
  const structuredTasks = filteredTasks.filter(t => t.dueDate && t.owner);
  const unstructuredTasks = filteredTasks.filter(t => !t.dueDate || !t.owner);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const addNoteToHistory = (rawText: string, taskCount: number) =>
    setNotes(prev => [
      { id: Date.now(), rawText, createdAt: new Date().toISOString(), taskCount },
      ...prev,
    ]);

  /**
   * Apply a TaskDraft to the backend and merge the result into local state.
   * Uses optimistic update so the UI responds immediately.
   */
  const applyTaskDraft = async (task: Task, draft: TaskDraft) => {
    const optimistic: Task = { ...task, ...draft, updatedAt: new Date().toISOString() };
    setTasks(prev => prev.map(t => (t.id === task.id ? optimistic : t)));
    const saved = await updateTask(task.id, draft);
    setTasks(prev => prev.map(t => (t.id === task.id ? saved : t)));
    // If the detail modal is open for this task, sync it too
    setSelectedTask(prev => (prev?.id === task.id ? saved : prev));
  };

  // ── Row-draft handlers ────────────────────────────────────────────────────

  const handleDraftChange = (task: Task, field: keyof TaskDraft, value: string) => {
    setRowDrafts(prev => ({
      ...prev,
      [task.id]: { ...prev[task.id], [field]: value as TaskPriority & TaskStatus },
    }));
  };

  const handleRevertRow = (task: Task) => {
    setRowDrafts(prev => { const n = { ...prev }; delete n[task.id]; return n; });
  };

  const handleSaveRow = (task: Task) => {
    const draft = rowDrafts[task.id];
    if (!draft || Object.keys(draft).length === 0) return;
    setConfirmRow({ task, draft });
  };

  const handleConfirmRowSave = async () => {
    if (!confirmRow) return;
    setIsSavingRow(true);
    try {
      await applyTaskDraft(confirmRow.task, confirmRow.draft);
      handleRevertRow(confirmRow.task);
      setConfirmRow(null);
    } finally {
      setIsSavingRow(false);
    }
  };

  // ── Task detail modal ─────────────────────────────────────────────────────

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task);
    setTaskNoteLinks([]);
    setIsLoadingNoteLinks(true);
    try {
      const links = await getTaskNotes(task.id);
      setTaskNoteLinks(links);
    } finally {
      setIsLoadingNoteLinks(false);
    }
  };

  const handleDetailSave = async (task: Task, changes: TaskDraft) => {
    await applyTaskDraft(task, changes);
  };

  // ── Extraction flow ───────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!noteText.trim()) return;

    // Bug 2: Duplicate note check (frontend fast-path)
    const isDuplicate = notes.some(
      n => n.rawText.trim().toLowerCase() === noteText.trim().toLowerCase(),
    );
    if (isDuplicate) {
      setExtractError(
        "This note has already been processed. Edit the note text before re-submitting.",
      );
      return;
    }
    setExtractError(null);

    setIsExtracting(true);
    try {
      const result = await extractTasksFromNotes(noteText);

      // If there are any unstructured tasks → show the confirmation modal.
      // Nothing is saved until the user clicks Accept.
      if (result.unstructuredNew.length > 0) {
        setPendingExtraction(result);
        return;  // note text intentionally preserved so user can read it
      }

      // All tasks are structured (or there are only proposed updates) — auto-save.
      const saved = await confirmAll({
        noteText: result.noteText,
        tasksToCreate: result.structuredNew.map(t => ({
          description: t.description,
          dueDate: t.dueDate,
          owner: t.owner,
          priority: t.priority,
          status: "To Do" as TaskStatus,
        })),
        approvedUpdates: [],
      });
      setTasks(prev => [...saved.created, ...prev]);
      addNoteToHistory(result.noteText, saved.created.length);
      setNoteText("");

      if (result.proposedUpdates.length > 0) {
        // Capture the note ID so confirmUpdates can write audit-link rows
        setPendingUpdatesNoteId(saved.noteId);
        setPendingUpdates(prev => [...result.proposedUpdates, ...prev]);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setExtractError(
          err.response.data?.detail ??
          "This note has already been processed.",
        );
      }
    } finally {
      setIsExtracting(false);
    }
  };

  // ── UnstructuredConfirmModal handlers ─────────────────────────────────────

  const handleConfirmAll = async (
    editedTasks: EditableTask[],
    approvedUpdates: ProposedUpdate[],
  ) => {
    if (!pendingExtraction) return;
    setIsConfirming(true);
    try {
      const saved = await confirmAll({
        noteText: pendingExtraction.noteText,
        tasksToCreate: editedTasks.map(t => ({
          description: t.description,
          dueDate: t.dueDate || null,
          owner: t.owner || null,
          priority: t.priority,
          status: t.status,
        })),
        approvedUpdates: approvedUpdates.map(u => ({
          taskId: u.taskId,
          changes: u.changes,
        })),
      });
      const updatedIds = new Set(saved.updated.map(u => u.id));
      setTasks(prev => [
        ...saved.created,
        ...prev.map(t => (updatedIds.has(t.id) ? saved.updated.find(u => u.id === t.id)! : t)),
      ]);
      addNoteToHistory(pendingExtraction.noteText, saved.created.length + saved.updated.length);
      setPendingExtraction(null);
      setNoteText("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setExtractError(err.response.data?.detail ?? "Duplicate note.");
        setPendingExtraction(null);
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelExtraction = () => setPendingExtraction(null);

  // ── UpdateConfirmationModal handlers ─────────────────────────────────────

  const handleConfirmUpdates = async (approved: ProposedUpdate[]) => {
    // Pass pendingUpdatesNoteId so the backend writes TaskNoteLink audit rows
    const updated = await confirmUpdates(
      approved.map(u => ({ taskId: u.taskId, changes: u.changes })),
      pendingUpdatesNoteId ?? undefined,
    );
    setTasks(prev => prev.map(t => updated.find(u => u.id === t.id) ?? t));
    const remaining = pendingUpdates.filter(u => !approved.some(a => a.taskId === u.taskId));
    setPendingUpdates(remaining);
    if (remaining.length === 0) setPendingUpdatesNoteId(null);
  };

  const dismissPendingUpdates = () => {
    setPendingUpdates([]);
    setPendingUpdatesNoteId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar active={view} onNavigate={setView} taskCount={tasks.length} noteCount={notes.length} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              {view === "tasks" ? "Tasks" : "Notes history"}
            </h1>
            <p className="text-xs text-slate-500">
              {view === "tasks"
                ? "Structured = has due date + owner · click any task to see its note history"
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
                onChange={v => { setNoteText(v); if (extractError) setExtractError(null); }}
                onExtract={handleExtract}
                isLoading={isExtracting}
              />

              {/* Duplicate / API error */}
              {extractError && (
                <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                  {extractError}
                </div>
              )}

              {/* Structured section */}
              <CollapsibleSection
                title="Structured"
                subtitle="Tasks with both a due date and an owner"
                count={structuredTasks.length}
                defaultOpen
              >
                <TaskTable
                  tasks={structuredTasks}
                  showDueDate
                  rowDrafts={rowDrafts}
                  onDraftChange={handleDraftChange}
                  onSaveRow={handleSaveRow}
                  onRevertRow={handleRevertRow}
                  onTaskClick={handleTaskClick}
                />
              </CollapsibleSection>

              {/* Unstructured section */}
              <CollapsibleSection
                title="Unstructured"
                subtitle="Tasks missing a due date or owner — click any cell to edit, then Save"
                count={unstructuredTasks.length}
                defaultOpen={false}
              >
                <TaskTable
                  tasks={unstructuredTasks}
                  showDueDate
                  inlineEditable
                  rowDrafts={rowDrafts}
                  onDraftChange={handleDraftChange}
                  onSaveRow={handleSaveRow}
                  onRevertRow={handleRevertRow}
                  onTaskClick={handleTaskClick}
                />
              </CollapsibleSection>
            </>
          ) : (
            <NotesHistory
              notes={notes.filter(n =>
                n.rawText.toLowerCase().includes(search.trim().toLowerCase()),
              )}
            />
          )}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* Feature 1: Unstructured confirm (deferred save) */}
      {pendingExtraction && (
        <UnstructuredConfirmModal
          noteText={pendingExtraction.noteText}
          structuredNew={pendingExtraction.structuredNew}
          unstructuredNew={pendingExtraction.unstructuredNew}
          proposedUpdates={pendingExtraction.proposedUpdates}
          isSubmitting={isConfirming}
          onConfirm={handleConfirmAll}
          onCancel={handleCancelExtraction}
        />
      )}

      {/* Proposed updates to existing tasks only */}
      {pendingUpdates.length > 0 && !pendingExtraction && (
        <UpdateConfirmationModal
          proposedUpdates={pendingUpdates}
          onConfirm={handleConfirmUpdates}
          onDismiss={dismissPendingUpdates}
        />
      )}

      {/* Per-row save confirmation */}
      {confirmRow && (
        <ConfirmChangesDialog
          task={confirmRow.task}
          draft={confirmRow.draft}
          isSubmitting={isSavingRow}
          onConfirm={handleConfirmRowSave}
          onCancel={() => setConfirmRow(null)}
        />
      )}

      {/* Task detail modal with note history */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          noteLinks={taskNoteLinks}
          isLoadingNotes={isLoadingNoteLinks}
          onClose={() => setSelectedTask(null)}
          onSave={handleDetailSave}
        />
      )}
    </div>
  );
}
