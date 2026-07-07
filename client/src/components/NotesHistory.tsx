import { useEffect, useState } from "react";
import type { NoteEntry } from "../types/task";
import { SortableHeader } from "./SortableHeader";
import { useSortableData } from "../hooks/useSortableData";

interface NotesHistoryProps {
  notes: NoteEntry[];
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesHistory({ notes }: NotesHistoryProps) {
  const { sortedRows, sort, toggleSort } = useSortableData<NoteEntry>(
    notes,
    "createdAt",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [notes, sort.key, sort.direction]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = sortedRows.slice(startIndex, startIndex + pageSize);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Submitted notes
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Every note run through extraction, most recent first.
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={safePage === totalPages}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No notes submitted yet — paste one on the Tasks tab to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortableHeader
                  label="Note"
                  active={sort.key === "rawText"}
                  direction={sort.direction}
                  onClick={() => toggleSort("rawText")}
                />
                <SortableHeader
                  label="Tasks extracted"
                  active={sort.key === "taskCount"}
                  direction={sort.direction}
                  onClick={() => toggleSort("taskCount")}
                  align="right"
                />
                <SortableHeader
                  label="Submitted"
                  active={sort.key === "createdAt"}
                  direction={sort.direction}
                  onClick={() => toggleSort("createdAt")}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((note) => (
                <tr
                  key={note.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="max-w-xl px-5 py-3.5">
                    <p className="line-clamp-2 text-slate-300">
                      {note.rawText}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="rounded-full bg-teal-400/10 px-2.5 py-1 font-mono text-xs tabular-nums text-teal-300">
                      {note.taskCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-500">
                    {formatTimestamp(note.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
