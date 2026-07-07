import type { NoteEntry } from '../types/task';
import { SortableHeader } from './SortableHeader';
import { useSortableData } from '../hooks/useSortableData';

interface NotesHistoryProps {
  notes: NoteEntry[];
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotesHistory({ notes }: NotesHistoryProps) {
  const { sortedRows, sort, toggleSort } = useSortableData<NoteEntry>(notes, 'createdAt');

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-100">Submitted notes</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Every note run through extraction, most recent first.
        </p>
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
                  active={sort.key === 'rawText'}
                  direction={sort.direction}
                  onClick={() => toggleSort('rawText')}
                />
                <SortableHeader
                  label="Tasks extracted"
                  active={sort.key === 'taskCount'}
                  direction={sort.direction}
                  onClick={() => toggleSort('taskCount')}
                  align="right"
                />
                <SortableHeader
                  label="Submitted"
                  active={sort.key === 'createdAt'}
                  direction={sort.direction}
                  onClick={() => toggleSort('createdAt')}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((note) => (
                <tr
                  key={note.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="max-w-xl px-5 py-3.5">
                    <p className="line-clamp-2 text-slate-300">{note.rawText}</p>
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
