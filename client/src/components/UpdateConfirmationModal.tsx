import { useState } from "react";
import type { ProposedUpdate } from "../types/task";

interface UpdateConfirmationModalProps {
  proposedUpdates: ProposedUpdate[];
  onConfirm: (approved: ProposedUpdate[]) => Promise<void>;
  onDismiss: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  priority: "Priority",
  dueDate: "Due date",
  owner: "Owner",
  status: "Status",
  description: "Description",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function UpdateConfirmationModal({
  proposedUpdates,
  onConfirm,
  onDismiss,
}: UpdateConfirmationModalProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(proposedUpdates.map((u) => u.taskId)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (taskId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleConfirm = async () => {
    const approved = proposedUpdates.filter((u) => selected.has(u.taskId));
    if (approved.length === 0) {
      onDismiss();
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(approved);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
            Review before applying
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-100">
            {proposedUpdates.length === 1
              ? "This looks like an update to an existing task"
              : `These look like updates to ${proposedUpdates.length} existing tasks`}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Nothing has been changed yet. Uncheck anything you don't want
            applied.
          </p>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-4">
          {proposedUpdates.map((update) => {
            const isChecked = selected.has(update.taskId);
            const changeEntries = Object.entries(update.changes);

            return (
              <label
                key={update.taskId}
                className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                  isChecked
                    ? "border-teal-400/30 bg-teal-400/5"
                    : "border-slate-800 bg-slate-950/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(update.taskId)}
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
                      {changeEntries.map(([field, newValue]) => {
                        const oldValue =
                          update.current[field as keyof typeof update.current];
                        return (
                          <div
                            key={field}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="w-20 shrink-0 text-slate-500">
                              {FIELD_LABELS[field] ?? field}
                            </span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-400 line-through decoration-slate-600">
                              {formatValue(oldValue)}
                            </span>
                            <svg
                              viewBox="0 0 12 8"
                              className="h-2 w-3 shrink-0 text-slate-600"
                            >
                              <path
                                d="M0 4H11M11 4L7.5 0.5M11 4L7.5 7.5"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                fill="none"
                              />
                            </svg>
                            <span className="rounded bg-teal-400/10 px-2 py-0.5 font-mono font-medium text-teal-300">
                              {formatValue(newValue)}
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

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onDismiss}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            Discard all
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? "Applying…"
              : `Apply ${selected.size} update${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
