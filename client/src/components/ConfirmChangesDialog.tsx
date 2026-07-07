import { useState } from "react";
import type { Task, TaskDraft } from "../types/task";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldDiff {
  label: string;
  from: string;
  to: string;
}

interface ConfirmChangesDialogProps {
  task: Task;
  draft: TaskDraft;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  priority: "Priority",
  status: "Status",
  owner: "Owner",
  dueDate: "Due Date",
};

function buildDiff(task: Task, draft: TaskDraft): FieldDiff[] {
  return (Object.keys(draft) as Array<keyof TaskDraft>)
    .filter((key) => draft[key] !== task[key as keyof Task])
    .map((key) => ({
      label: FIELD_LABELS[key] ?? key,
      from: String(task[key as keyof Task] ?? "—") || "—",
      to: String(draft[key] ?? "—") || "—",
    }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmChangesDialog({
  task,
  draft,
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmChangesDialogProps) {
  const diffs = buildDiff(task, draft);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-changes-title"
      >
        {/* Header */}
        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Confirm changes
          </p>
          <h2
            id="confirm-changes-title"
            className="mt-1 truncate text-sm font-semibold text-slate-100"
          >
            {task.description}
          </h2>
        </div>

        {/* Diff table */}
        <div className="px-5 py-4">
          {diffs.length === 0 ? (
            <p className="text-sm text-slate-400">No changes to apply.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Field
                  </th>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Before
                  </th>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {diffs.map((d) => (
                  <tr key={d.label}>
                    <td className="py-2 pr-4 font-medium text-slate-300">
                      {d.label}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-400 line-through decoration-slate-600">
                        {d.from}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="rounded bg-teal-400/10 px-1.5 py-0.5 font-mono text-xs font-medium text-teal-300">
                        {d.to}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || diffs.length === 0}
            className="rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Apply Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
