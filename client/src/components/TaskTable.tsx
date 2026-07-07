import { useState, useRef } from 'react';
import type { Task, TaskDraft, TaskPriority, TaskStatus } from '../types/task';
import { SortableHeader } from './SortableHeader';
import { useSortableData } from '../hooks/useSortableData';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskTableProps {
  tasks: Task[];
  showDueDate: boolean;
  /** When true, owner and dueDate cells become click-to-edit. */
  inlineEditable?: boolean;
  /** Per-row unsaved changes, keyed by task.id. */
  rowDrafts: Record<number, TaskDraft>;
  /** Called whenever a field value changes in this table (goes into rowDrafts). */
  onDraftChange: (task: Task, field: keyof TaskDraft, value: string) => void;
  /** Called when user clicks "Save" for a row — triggers confirm dialog. */
  onSaveRow: (task: Task) => void;
  /** Called when user clicks "Revert" — clears drafts for that row. */
  onRevertRow: (task: Task) => void;
  /** Called when user clicks the description cell — opens TaskDetailModal. */
  onTaskClick: (task: Task) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Done'];
const PRIORITY_OPTIONS: TaskPriority[] = ['High', 'Medium', 'Low'];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  Medium: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  Low: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Inline editable cell — blur/Enter commits to onSave (which becomes onDraftChange)
// ---------------------------------------------------------------------------

function InlineTextCell({
  value, placeholder, onSave,
}: { value: string; placeholder: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    onSave(inputVal);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setInputVal(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); }}
        className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-slate-800/60"
        title="Click to edit"
      >
        <span className={value ? 'text-slate-300' : 'italic text-slate-600'}>
          {value || placeholder}
        </span>
        <svg viewBox="0 0 14 14" className="h-3 w-3 flex-shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" fill="none">
          <path d="M10 1.5l2.5 2.5L4 12.5H1.5V10L10 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }
  return (
    <input
      ref={ref}
      value={inputVal}
      onChange={e => setInputVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setInputVal(value); } }}
      className="w-full rounded border border-teal-400/40 bg-slate-800 px-2 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-400/40"
    />
  );
}

function InlineDateCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => { setEditing(false); onSave(inputVal); };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setInputVal(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); }}
        className="group flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-xs tabular-nums transition-colors hover:bg-slate-800/60"
        title="Click to set due date"
      >
        <span className={value ? 'text-slate-300' : 'italic text-slate-600'}>
          {value || 'Set date'}
        </span>
        <svg viewBox="0 0 14 14" className="h-3 w-3 flex-shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" fill="none">
          <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 1v2M10 1v2M1 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    );
  }
  return (
    <input
      ref={ref}
      type="date"
      value={inputVal}
      onChange={e => setInputVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setInputVal(value); } }}
      className="rounded border border-teal-400/40 bg-slate-800 px-2 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-400/40"
    />
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

export function TaskTable({
  tasks,
  showDueDate,
  inlineEditable = false,
  rowDrafts,
  onDraftChange,
  onSaveRow,
  onRevertRow,
  onTaskClick,
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
            <SortableHeader label="Task" active={sort.key === 'description'} direction={sort.direction} onClick={() => toggleSort('description')} />
            <SortableHeader label="Owner" active={sort.key === 'owner'} direction={sort.direction} onClick={() => toggleSort('owner')} />
            <SortableHeader label="Priority" active={sort.key === 'priority'} direction={sort.direction} onClick={() => toggleSort('priority')} />
            <SortableHeader label="Status" active={sort.key === 'status'} direction={sort.direction} onClick={() => toggleSort('status')} />
            {showDueDate && (
              <SortableHeader label="Due" active={sort.key === 'dueDate'} direction={sort.direction} onClick={() => toggleSort('dueDate')} />
            )}
            <SortableHeader label="Created" active={sort.key === 'createdAt'} direction={sort.direction} onClick={() => toggleSort('createdAt')} />
            <SortableHeader label="Updated" active={sort.key === 'updatedAt'} direction={sort.direction} onClick={() => toggleSort('updatedAt')} />
            {/* Actions column — always present but only visible when a row is dirty */}
            <th className="w-24 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(task => {
            const d = rowDrafts[task.id] ?? {};
            const isDirty = Object.keys(d).some(k => d[k as keyof TaskDraft] !== task[k as keyof Task]);

            // Effective display values: draft overrides saved value
            const priority: TaskPriority = d.priority ?? task.priority;
            const status: TaskStatus = d.status ?? task.status;
            const owner: string = d.owner !== undefined ? d.owner : (task.owner ?? '');
            const dueDate: string = d.dueDate !== undefined ? d.dueDate : (task.dueDate ?? '');

            return (
              <tr
                key={task.id}
                className={`border-b border-slate-800/60 last:border-0 transition-colors ${
                  isDirty ? 'bg-amber-400/[0.03]' : 'hover:bg-slate-800/30'
                }`}
              >
                {/* Description — click to open detail modal */}
                <td className="max-w-xs px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onTaskClick(task)}
                    className="group flex items-center gap-2 text-left"
                    title="Open task details"
                  >
                    <p className="truncate font-medium text-slate-100 underline-offset-2 group-hover:underline">
                      {task.description}
                    </p>
                  </button>
                  {isDirty && (
                    <p className="mt-0.5 text-[10px] font-semibold text-amber-400">● unsaved</p>
                  )}
                </td>

                {/* Owner */}
                <td className="px-4 py-3">
                  {inlineEditable ? (
                    <InlineTextCell
                      value={owner}
                      placeholder="Add owner"
                      onSave={v => onDraftChange(task, 'owner', v)}
                    />
                  ) : (
                    <span className="text-slate-300">{owner || '—'}</span>
                  )}
                </td>

                {/* Priority — draft-first select (no immediate save) */}
                <td className="px-4 py-3">
                  <select
                    value={priority}
                    onChange={e => onDraftChange(task, 'priority', e.target.value)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${PRIORITY_STYLES[priority]}`}
                  >
                    {PRIORITY_OPTIONS.map(o => (
                      <option key={o} value={o} className="bg-slate-900 text-slate-100">{o}</option>
                    ))}
                  </select>
                </td>

                {/* Status — draft-first select (no immediate save) */}
                <td className="px-4 py-3">
                  <select
                    value={status}
                    onChange={e => onDraftChange(task, 'status', e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o} value={o} className="bg-slate-900">{o}</option>
                    ))}
                  </select>
                </td>

                {/* Due Date */}
                {showDueDate && (
                  <td className="whitespace-nowrap px-4 py-3">
                    {inlineEditable ? (
                      <InlineDateCell
                        value={dueDate}
                        onSave={v => onDraftChange(task, 'dueDate', v)}
                      />
                    ) : (
                      <span className="font-mono text-xs tabular-nums text-slate-300">
                        {dueDate || '—'}
                      </span>
                    )}
                  </td>
                )}

                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                  {formatTimestamp(task.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                  {formatTimestamp(task.updatedAt)}
                </td>

                {/* Actions — Save + Revert, only when dirty */}
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  {isDirty ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRevertRow(task)}
                        title="Discard changes"
                        className="rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                      >
                        Revert
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveRow(task)}
                        className="rounded-md bg-teal-400/10 px-2.5 py-1 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-400/20"
                      >
                        💾 Save
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
