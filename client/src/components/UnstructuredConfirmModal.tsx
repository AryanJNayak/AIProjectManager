import { useState } from 'react';
import type { ProposedNewTask, ProposedUpdate, TaskPriority, TaskStatus } from '../types/task';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditableTask {
  description: string;   // locked — from LLM, cannot be changed
  dueDate: string;       // editable
  owner: string;         // editable
  priority: TaskPriority;
  status: TaskStatus;
}

interface UnstructuredConfirmModalProps {
  noteText: string;
  structuredNew: ProposedNewTask[];
  unstructuredNew: ProposedNewTask[];
  proposedUpdates: ProposedUpdate[];
  isSubmitting: boolean;
  onConfirm: (tasks: EditableTask[], approvedUpdates: ProposedUpdate[]) => Promise<void>;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: TaskPriority[] = ['High', 'Medium', 'Low'];
const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  Medium: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  Low: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
};

const UPDATE_FIELD_LABELS: Record<string, string> = {
  priority: 'Priority',
  dueDate: 'Due date',
  due_date: 'Due date',
  owner: 'Owner',
  status: 'Status',
  description: 'Description',
};

function formatUpdateValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// ---------------------------------------------------------------------------
// Sub-component: editable task card
// ---------------------------------------------------------------------------

function TaskEditCard({
  task,
  index,
  isUnstructured,
  onChange,
}: {
  task: EditableTask;
  index: number;
  isUnstructured: boolean;
  onChange: (updated: EditableTask) => void;
}) {
  const missingDate = !task.dueDate;
  const missingOwner = !task.owner.trim();

  const inputBase =
    'w-full rounded-lg border bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-colors';
  const emptyHighlight =
    'border-amber-400/70 ring-amber-400/20 focus:border-amber-400 focus:ring-amber-400/30';
  const normalField =
    'border-slate-700 focus:border-teal-400/50 focus:ring-teal-400/20';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isUnstructured
          ? 'border-amber-400/25 bg-amber-400/3'
          : 'border-slate-800 bg-slate-900/40'
      }`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Tags */}
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {isUnstructured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                  <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm-.5 3h1v4h-1V3zm0 5h1v1h-1V8z" />
                </svg>
                Unstructured
              </span>
            )}
            {!isUnstructured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                  <path d="M10 2.5L4.5 8 2 5.5l-.7.7L4.5 9.4 10.7 3.2 10 2.5z" />
                </svg>
                Structured
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {/* Description — locked */}
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none">
              <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-medium leading-snug text-slate-100">{task.description}</p>
          </div>
        </div>
      </div>

      {/* Editable fields grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Due Date */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Due Date
            {missingDate && (
              <span className="text-amber-400" title="Required for structured task">*</span>
            )}
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={task.dueDate}
            onChange={(e) => onChange({ ...task, dueDate: e.target.value })}
            className={`${inputBase} ${missingDate ? emptyHighlight : normalField}`}
          />
        </div>

        {/* Owner */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Owner
            {missingOwner && (
              <span className="text-amber-400" title="Optional but recommended">*</span>
            )}
          </label>
          <input
            type="text"
            value={task.owner}
            placeholder="e.g. aryan naya"
            onChange={(e) => onChange({ ...task, owner: e.target.value })}
            className={`${inputBase} ${missingOwner ? emptyHighlight : normalField}`}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Priority
          </label>
          <select
            value={task.priority}
            onChange={(e) => onChange({ ...task, priority: e.target.value as TaskPriority })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p} className="bg-slate-900">{p}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Status
          </label>
          <select
            value={task.status}
            onChange={(e) => onChange({ ...task, status: e.target.value as TaskStatus })}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-slate-900">{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function UnstructuredConfirmModal({
  structuredNew,
  unstructuredNew,
  proposedUpdates,
  noteText,
  isSubmitting,
  onConfirm,
  onCancel,
}: UnstructuredConfirmModalProps) {
  // Merge all new tasks: structured first, then unstructured
  const allTasks: Array<EditableTask & { _isUnstructured: boolean }> = [
    ...structuredNew.map((t) => ({
      description: t.description,
      dueDate: t.dueDate ?? '',
      owner: t.owner ?? '',
      priority: t.priority,
      status: 'To Do' as TaskStatus,
      _isUnstructured: false,
    })),
    ...unstructuredNew.map((t) => ({
      description: t.description,
      dueDate: t.dueDate ?? '',
      owner: t.owner ?? '',
      priority: t.priority,
      status: 'To Do' as TaskStatus,
      _isUnstructured: true,
    })),
  ];

  const [editedTasks, setEditedTasks] = useState(allTasks);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(
    () => new Set(proposedUpdates.map((u) => u.taskId)),
  );

  const updateTask = (index: number, updated: EditableTask) => {
    setEditedTasks((prev) => prev.map((t, i) => (i === index ? { ...updated, _isUnstructured: t._isUnstructured } : t)));
  };

  const toggleUpdate = (taskId: number) => {
    setSelectedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAccept = async () => {
    const approved = proposedUpdates.filter((u) => selectedUpdates.has(u.taskId));
    await onConfirm(
      editedTasks.map(({ _isUnstructured: _u, ...rest }) => rest),
      approved,
    );
  };

  const totalNew = editedTasks.length;
  const totalApproved = selectedUpdates.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" style={{ maxHeight: '90vh' }}>

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-slate-800 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Review before saving
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-100">
            {totalNew > 0
              ? `${totalNew} task${totalNew !== 1 ? 's' : ''} extracted — nothing saved yet`
              : 'Review proposed updates'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Fill in the highlighted fields and edit anything else, then click Accept.
            {' '}Cancelling discards everything — no notes or tasks will be stored.
          </p>

          {/* Note preview */}
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Original note
            </p>
            <p className="line-clamp-2 text-xs text-slate-400">{noteText}</p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">

          {/* New tasks */}
          {editedTasks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                New tasks ({editedTasks.length})
              </p>
              <div className="space-y-3">
                {editedTasks.map((task, idx) => (
                  <TaskEditCard
                    key={idx}
                    task={task}
                    index={idx}
                    isUnstructured={task._isUnstructured}
                    onChange={(updated) => updateTask(idx, updated)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Proposed updates to existing tasks */}
          {proposedUpdates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Updates to existing tasks ({proposedUpdates.length})
              </p>
              <div className="space-y-2">
                {proposedUpdates.map((update) => {
                  const isChecked = selectedUpdates.has(update.taskId);
                  const entries = Object.entries(update.changes);
                  return (
                    <label
                      key={update.taskId}
                      className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                        isChecked
                          ? 'border-teal-400/30 bg-teal-400/5'
                          : 'border-slate-800 bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUpdate(update.taskId)}
                          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-400 focus:ring-teal-400/40"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {update.description}
                          </p>
                          <p className="mb-2 font-mono text-[11px] text-slate-500">
                            task #{update.taskId}
                          </p>
                          <div className="space-y-1.5">
                            {entries.map(([field, newVal]) => {
                              const oldVal = update.current[field as keyof typeof update.current];
                              return (
                                <div key={field} className="flex items-center gap-2 text-xs">
                                  <span className="w-20 shrink-0 text-slate-500">
                                    {UPDATE_FIELD_LABELS[field] ?? field}
                                  </span>
                                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-400 line-through decoration-slate-600">
                                    {formatUpdateValue(oldVal)}
                                  </span>
                                  <svg viewBox="0 0 12 8" className="h-2 w-3 shrink-0 text-slate-600">
                                    <path d="M0 4H11M11 4L7.5 0.5M11 4L7.5 7.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                                  </svg>
                                  <span className="rounded bg-teal-400/10 px-2 py-0.5 font-mono font-medium text-teal-300">
                                    {formatUpdateValue(newVal)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
          >
            Cancel — discard all
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isSubmitting}
            className="rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? 'Saving…'
              : `Accept & save ${totalNew + totalApproved} item${totalNew + totalApproved !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
