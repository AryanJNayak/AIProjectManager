import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { TaskTable } from "./components/TaskTable";
import { NotesHistory } from "./components/NotesHistory";
import { NoteComposer } from "./components/NoteComposer";
import { UpdateConfirmationModal } from "./components/UpdateConfirmationModal";
import {
  UnstructuredConfirmModal,
  type EditableTask,
} from "./components/UnstructuredConfirmModal";
import { ConfirmChangesDialog } from "./components/ConfirmChangesDialog";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { AlertPopup, type AlertType } from "./components/AlertPopup";
import { ExportPreviewModal } from "./components/ExportPreviewModal";
import {
  getNotesHistory,
  getTaskNotes,
  getTasks,
  updateTask,
  exportTasks,
  previewExport,
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
  const [pendingExtraction, setPendingExtraction] =
    useState<ExtractionResponse | null>(null);
  // 2. Proposed updates to existing tasks only → UpdateConfirmationModal
  const [pendingUpdates, setPendingUpdates] = useState<ProposedUpdate[]>([]);
  // The note ID from the confirm_all call that triggered these updates.
  // Forwarded to confirmUpdates so the backend can write TaskNoteLink rows.
  const [pendingUpdatesNoteId, setPendingUpdatesNoteId] = useState<
    number | null
  >(null);

  // ── Per-row draft changes (not yet saved to DB) ───────────────────────────
  const [rowDrafts, setRowDrafts] = useState<Record<number, TaskDraft>>({});
  // When a row's Save is clicked, queue it here to show ConfirmChangesDialog
  const [confirmRow, setConfirmRow] = useState<{
    task: Task;
    draft: TaskDraft;
  } | null>(null);
  const [isSavingRow, setIsSavingRow] = useState(false);

  // ── Task detail modal ─────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskNoteLinks, setTaskNoteLinks] = useState<NoteLink[]>([]);
  const [isLoadingNoteLinks, setIsLoadingNoteLinks] = useState(false);

  const [exportSelection, setExportSelection] = useState({
    structured: true,
    unstructured: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState<{
    filename: string;
    size: number;
    createdAt: string;
    format: "csv" | "xlsx";
    tables: Array<{ name: string; records: number }>;
  } | null>(null);

  // —— Alert popup (past-date, done-task, duplicate note, etc.) ————————————————
  const [alert, setAlert] = useState<{
    type: AlertType;
    title: string;
    message: string;
  } | null>(null);

  const showAlert = (err: unknown, fallbackTitle = "Something went wrong") => {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const detail: string = err.response.data?.detail ?? err.message;
      if (status === 403) {
        setAlert({ type: "warning", title: "Read-only task", message: detail });
      } else if (status === 422) {
        // Extract the first validation error message
        const raw = err.response.data;
        const msg: string =
          typeof raw?.detail === "string"
            ? raw.detail
            : Array.isArray(raw?.detail)
              ? (raw.detail[0]?.msg ?? detail)
              : detail;
        setAlert({ type: "error", title: "Invalid date", message: msg });
      } else if (status === 409) {
        setAlert({ type: "warning", title: "Duplicate note", message: detail });
      } else {
        setAlert({ type: "error", title: fallbackTitle, message: detail });
      }
    } else if (err instanceof Error) {
      setAlert({ type: "error", title: fallbackTitle, message: err.message });
    }
  };

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((err) => showAlert(err, "Failed to fetch tasks"));
    getNotesHistory()
      .then(setNotes)
      .catch((err) => showAlert(err, "Failed to fetch notes history"));
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) =>
      [t.description, t.owner]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q)),
    );
  }, [tasks, search]);

  // Bug 1 fix: Structured = has BOTH dueDate AND owner; otherwise Unstructured.
  const structuredTasks = filteredTasks.filter((t) => t.dueDate && t.owner);
  const unstructuredTasks = filteredTasks.filter((t) => !t.dueDate || !t.owner);
  const [structuredPage, setStructuredPage] = useState(1);
  const [unstructuredPage, setUnstructuredPage] = useState(1);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const addNoteToHistory = (rawText: string, taskCount: number) =>
    setNotes((prev) => [
      {
        id: Date.now(),
        rawText,
        createdAt: new Date().toISOString(),
        taskCount,
      },
      ...prev,
    ]);

  useEffect(() => {
    setStructuredPage(1);
  }, [structuredTasks.length, search]);

  useEffect(() => {
    setUnstructuredPage(1);
  }, [unstructuredTasks.length, search]);

  /**
   * Apply a TaskDraft to the backend and merge the result into local state.
   * Uses optimistic update; rolls back on error and shows the AlertPopup.
   */
  const applyTaskDraft = async (task: Task, draft: TaskDraft) => {
    const optimistic: Task = {
      ...task,
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));
    try {
      const saved = await updateTask(task.id, draft);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
      setSelectedTask((prev) => (prev?.id === task.id ? saved : prev));
    } catch (err) {
      // Roll back optimistic update on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setSelectedTask((prev) => (prev?.id === task.id ? task : prev));
      showAlert(err, "Could not save task");
      throw err; // re-throw so callers know the save failed
    }
  };

  // ── Row-draft handlers ────────────────────────────────────────────────────

  const handleDraftChange = (
    task: Task,
    field: keyof TaskDraft,
    value: string,
  ) => {
    setRowDrafts((prev) => ({
      ...prev,
      [task.id]: {
        ...prev[task.id],
        [field]: value as TaskPriority & TaskStatus,
      },
    }));
  };

  const handleRevertRow = (task: Task) => {
    setRowDrafts((prev) => {
      const n = { ...prev };
      delete n[task.id];
      return n;
    });
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
    } catch {
      // error already shown by showAlert inside applyTaskDraft
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

  const handleToggleExportTable = (table: "structured" | "unstructured") => {
    setExportSelection((prev) => ({
      ...prev,
      [table]: !prev[table],
    }));
    setExportPreview(null);
  };

  const handlePreviewExport = async () => {
    if (!exportSelection.structured && !exportSelection.unstructured) {
      showAlert(
        new Error("Please select one or more tables before exporting."),
        "Export selection missing",
      );
      return;
    }

    setIsExporting(true);
    setExportPreview(null);
    try {
      const preview = await previewExport([
        ...(exportSelection.structured ? ["structured"] : []),
        ...(exportSelection.unstructured ? ["unstructured"] : []),
      ]);
      setExportPreview(preview);
    } catch (err: unknown) {
      showAlert(err, "Failed to generate export preview");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!exportPreview) return;

    setIsExporting(true);
    try {
      const result = await exportTasks([
        ...(exportSelection.structured ? ["structured"] : []),
        ...(exportSelection.unstructured ? ["unstructured"] : []),
      ]);

      const url = window.URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      setExportPreview(null);
    } catch (err: unknown) {
      showAlert(err, "Failed to download export");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Extraction flow ───────────────────────────────────────────────────────

  const handleExtract = async () => {
    if (!noteText.trim()) return;

    // Bug 2: Duplicate note check (frontend fast-path)
    const isDuplicate = notes.some(
      (n) => n.rawText.trim().toLowerCase() === noteText.trim().toLowerCase(),
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
      if (result.unstructuredNew.length > 0) {
        setPendingExtraction(result);
        return;
      }

      // All structured (or only proposed updates) — auto-save.
      const saved = await confirmAll({
        noteText: result.noteText,
        tasksToCreate: result.structuredNew.map((t) => ({
          description: t.description,
          dueDate: t.dueDate,
          owner: t.owner,
          priority: t.priority,
          status: "To Do" as TaskStatus,
        })),
        approvedUpdates: [],
      });
      setTasks((prev) => [...saved.created, ...prev]);
      addNoteToHistory(result.noteText, saved.created.length);
      setNoteText("");

      if (result.proposedUpdates.length > 0) {
        setPendingUpdatesNoteId(saved.noteId);
        setPendingUpdates((prev) => [...result.proposedUpdates, ...prev]);
      }
    } catch (err: unknown) {
      showAlert(err, "Extraction failed");
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
        tasksToCreate: editedTasks.map((t) => ({
          description: t.description,
          dueDate: t.dueDate || null,
          owner: t.owner || null,
          priority: t.priority,
          status: t.status,
        })),
        approvedUpdates: approvedUpdates.map((u) => ({
          taskId: u.taskId,
          changes: u.changes,
        })),
      });
      const updatedIds = new Set(saved.updated.map((u) => u.id));
      setTasks((prev) => [
        ...saved.created,
        ...prev.map((t) =>
          updatedIds.has(t.id) ? saved.updated.find((u) => u.id === t.id)! : t,
        ),
      ]);
      addNoteToHistory(
        pendingExtraction.noteText,
        saved.created.length + saved.updated.length,
      );
      setPendingExtraction(null);
      setNoteText("");
    } catch (err: unknown) {
      showAlert(err, "Could not save tasks");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelExtraction = () => setPendingExtraction(null);

  // ── UpdateConfirmationModal handlers ─────────────────────────────────────

  const handleConfirmUpdates = async (approved: ProposedUpdate[]) => {
    try {
      const updated = await confirmUpdates(
        approved.map((u) => ({ taskId: u.taskId, changes: u.changes })),
        pendingUpdatesNoteId ?? undefined,
      );
      setTasks((prev) =>
        prev.map((t) => updated.find((u) => u.id === t.id) ?? t),
      );
      const remaining = pendingUpdates.filter(
        (u) => !approved.some((a) => a.taskId === u.taskId),
      );
      setPendingUpdates(remaining);
      if (remaining.length === 0) setPendingUpdatesNoteId(null);
    } catch (err) {
      showAlert(err, "Could not apply updates");
    }
  };

  const dismissPendingUpdates = () => {
    setPendingUpdates([]);
    setPendingUpdatesNoteId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar
        active={view}
        onNavigate={setView}
        taskCount={tasks.length}
        noteCount={notes.length}
        exportSelection={exportSelection}
        onToggleExportTable={handleToggleExportTable}
        onPreviewExport={handlePreviewExport}
        isExporting={isExporting}
      />

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
                onChange={(v) => {
                  setNoteText(v);
                  if (extractError) setExtractError(null);
                }}
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
                headerRight={
                  structuredTasks.length > 5 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStructuredPage((prev) => Math.max(1, prev - 1));
                        }}
                        disabled={structuredPage === 1}
                        className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>
                        Page {structuredPage} of{" "}
                        {Math.max(1, Math.ceil(structuredTasks.length / 5))}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStructuredPage((prev) =>
                            Math.min(
                              Math.max(
                                1,
                                Math.ceil(structuredTasks.length / 5),
                              ),
                              prev + 1,
                            ),
                          );
                        }}
                        disabled={
                          structuredPage ===
                          Math.max(1, Math.ceil(structuredTasks.length / 5))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  ) : null
                }
              >
                <TaskTable
                  tasks={structuredTasks}
                  showDueDate
                  page={structuredPage}
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
                headerRight={
                  unstructuredTasks.length > 5 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnstructuredPage((prev) => Math.max(1, prev - 1));
                        }}
                        disabled={unstructuredPage === 1}
                        className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>
                        Page {unstructuredPage} of{" "}
                        {Math.max(1, Math.ceil(unstructuredTasks.length / 5))}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnstructuredPage((prev) =>
                            Math.min(
                              Math.max(
                                1,
                                Math.ceil(unstructuredTasks.length / 5),
                              ),
                              prev + 1,
                            ),
                          );
                        }}
                        disabled={
                          unstructuredPage ===
                          Math.max(1, Math.ceil(unstructuredTasks.length / 5))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  ) : null
                }
              >
                <TaskTable
                  tasks={unstructuredTasks}
                  showDueDate
                  page={unstructuredPage}
                  pageSize={5}
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
              notes={notes.filter((n) =>
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

      {exportPreview && (
        <ExportPreviewModal
          exportPreview={exportPreview}
          isDownloading={isExporting}
          onDownload={handleDownloadExport}
          onClose={() => setExportPreview(null)}
        />
      )}

      {/* Global error / warning popup */}
      {alert && (
        <AlertPopup
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
