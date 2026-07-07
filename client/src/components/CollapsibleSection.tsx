import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  count,
  defaultOpen = true,
  headerRight,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
            fill="currentColor"
          >
            <path
              d="M7 4l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          <span className="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-[11px] tabular-nums text-slate-400">
            {count}
          </span>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-800">{children}</div>
        </div>
      </div>
    </section>
  );
}
