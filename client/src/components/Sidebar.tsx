export type View = "tasks" | "notes";

interface SidebarProps {
  active: View;
  onNavigate: (view: View) => void;
  taskCount: number;
  noteCount: number;
  exportSelection: { structured: boolean; unstructured: boolean };
  onToggleExportTable: (table: "structured" | "unstructured") => void;
  onPreviewExport: () => void;
  isExporting: boolean;
}

export function Sidebar({
  active,
  onNavigate,
  taskCount,
  noteCount,
  exportSelection,
  onToggleExportTable,
  onPreviewExport,
  isExporting,
}: SidebarProps) {
  const items = [
    {
      id: "tasks" as View,
      label: "Tasks",
      count: taskCount,
      icon: (
        <path
          d="M4 6h12M4 10h12M4 14h8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ),
    },
    {
      id: "notes" as View,
      label: "Notes history",
      count: noteCount,
      icon: (
        <path
          d="M5 3.5h7l3 3V16a.5.5 0 01-.5.5h-9A.5.5 0 015 16V4a.5.5 0 01.5-.5z M12 3.5V6.5H15"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950/60 px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <circle cx="10" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-100">
            AI PM Assistant
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            workspace
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors mb-2 ${
                isActive
                  ? "bg-teal-400/10 text-teal-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 20 20" className="h-4 w-4">
                  {item.icon}
                </svg>
                {item.label}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                  isActive
                    ? "bg-teal-400/15 text-teal-300"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Export tables
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportSelection.structured}
                onChange={() => onToggleExportTable("structured")}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-400"
              />
              Structured
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={exportSelection.unstructured}
                onChange={() => onToggleExportTable("unstructured")}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-400"
              />
              Unstructured
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onPreviewExport}
          disabled={isExporting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-teal-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Generating…" : "Preview export"}
        </button>
      </div>
    </aside>
  );
}
