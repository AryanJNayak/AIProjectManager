import { useState } from 'react';
import type { NoteLink, Task, TaskDraft, TaskPriority, TaskStatus } from '../types/task';
import { ConfirmChangesDialog } from './ConfirmChangesDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskDetailModalProps {
  task: Task;
  noteLinks: NoteLink[];
  isLoadingNotes: boolean;
  onClose: () => void;
  onSave: (task: Task, changes: TaskDraft) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: TaskPriority[] = ['High', 'Medium', 'Low'];
const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
  Medium: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  Low: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
};

const LINK_TYPE_STYLES = {
  created: 'bg-teal-400/10 text-teal-300 border-teal-400/30',
  updated: 'bg-violet-400/10 text-violet-300 border-violet-400/30',
};

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, n = 140) {
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskDetailModal({
  task,
  noteLinks,
  isLoadingNotes,
  onClose,
  onSave,
}: TaskDetailModalProps) {
  const [draft, setDraft] = useState<TaskDraft>({});
  const [showNotes, setShowNotes] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof TaskDraft>(key: K, val: TaskDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: val }));

  // Current displayed value — draft overrides saved value
  const val = <K extends keyof Task>(key: K): Task[K] =>
    (draft[key as keyof TaskDraft] as Task[K]) ?? task[key];

  const isDirty = Object.keys(draft).some(
    k => draft[k as keyof TaskDraft] !== task[k as keyof Task],
  );

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSubmitting(true);
    try {
      await onSave(task, draft);
      setDraft({});
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    'w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-colors';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="flex w-full max-w-xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" style={{ maxHeight: '90vh' }}>

          {/* ── Header ── */}
          <div className="flex-shrink-0 border-b border-slate-800 px-6 py-4">
            <div className="flex items-start gap-3">
              {/* Toggle notes button */}
              <button
                type="button"
                onClick={() => setShowNotes(v => !v)}
                title={showNotes ? 'Hide note history' : 'Show note history'}
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  showNotes
                    ? 'border-teal-400/30 bg-teal-400/10 text-teal-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {/* Note/list icon */}
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none">
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M4 4.5h6M4 7h6M4 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Task #{task.id}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold leading-snug text-slate-100">
                  {task.description}
                </h2>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Pill badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                {task.status}
              </span>
              {task.dueDate && (
                <span className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                  Due {task.dueDate}
                </span>
              )}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Editable fields */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Edit fields
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </label>
                  <select
                    value={val('status')}
                    onChange={e => set('status', e.target.value as TaskStatus)}
                    className={inputBase}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s} className="bg-slate-900">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Priority
                  </label>
                  <select
                    value={val('priority')}
                    onChange={e => set('priority', e.target.value as TaskPriority)}
                    className={inputBase}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p} className="bg-slate-900">{p}</option>
                    ))}
                  </select>
                </div>

                {/* Owner */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={val('owner') ?? ''}
                    placeholder="Assign to someone…"
                    onChange={e => set('owner', e.target.value)}
                    className={inputBase}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Due Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={val('dueDate') ?? ''}
                    onChange={e => set('dueDate', e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Dirty indicator */}
              {isDirty && (
                <p className="mt-2 text-[11px] text-amber-400">
                  ● Unsaved changes — click Save to apply.
                </p>
              )}
            </div>

            {/* Notes history (toggleable) */}
            {showNotes && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Note history
                  <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-slate-400">
                    {isLoadingNotes ? '…' : noteLinks.length}
                  </span>
                </p>

                {isLoadingNotes ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
                    Loading notes…
                  </div>
                ) : noteLinks.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">
                    No note links found for this task.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {noteLinks.map((nl, i) => (
                      <div
                        key={nl.noteId + '-' + i}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              LINK_TYPE_STYLES[nl.linkType as keyof typeof LINK_TYPE_STYLES] ??
                              LINK_TYPE_STYLES.updated
                            }`}
                          >
                            {nl.linkType}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {formatDatetime(nl.createdAt)}
                          </span>
                          {i === 0 && (
                            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                              latest
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400">
                          {truncate(nl.noteText)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={() => { setDraft({}); onClose(); }}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setDraft({})}
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-slate-300"
                >
                  Revert
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={!isDirty}
                className="rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nested confirm dialog */}
      {showConfirm && (
        <ConfirmChangesDialog
          task={task}
          draft={draft}
          isSubmitting={isSubmitting}
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
