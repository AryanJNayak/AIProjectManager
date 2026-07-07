import type { FormEvent } from "react";

interface NoteComposerProps {
  value: string;
  onChange: (value: string) => void;
  onExtract: () => void;
  isLoading: boolean;
}

export function NoteComposer({
  value,
  onChange,
  onExtract,
  isLoading,
}: NoteComposerProps) {
  const demoText = `Launch the new onboarding experience. Owner: Maya. Due date: 2026-07-18. Priority: High.`;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onExtract();
  };

  const handleDemo = () => {
    onChange("");
    window.setTimeout(() => onChange(demoText), 0);
  };

  return (
    <form
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      onSubmit={handleSubmit}
    >
      {/* ── Extraction in-progress overlay ─────────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/90 backdrop-blur-sm">
          {/* Spinner */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
            {/* Spinning arc */}
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-teal-400 [animation-duration:700ms]" />
            {/* Inner dot */}
            <div className="h-3 w-3 rounded-full bg-teal-400/60 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-100">
              Extracting tasks…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Running LLM + fuzzy matching
            </p>
          </div>
        </div>
      )}

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
            AI intake
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            Turn meeting notes into action plans
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDemo}
            className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-200 transition-all hover:border-teal-400/40 hover:text-teal-300"
          >
            Demo
          </button>
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                Extracting…
              </>
            ) : (
              <>
                {/* Wand / spark icon */}
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path
                    d="M2 14L9 7M6 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 1l.5 1.5L14 3l-1.5.5L12 5l-.5-1.5L10 3l1.5-.5L12 1z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                  />
                </svg>
                Extract tasks
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Textarea ───────────────────────────────────────────────────────── */}
      <label
        htmlFor="notes"
        className="mb-1.5 block text-xs font-medium text-slate-400"
      >
        Paste notes, follow-ups, or project updates
      </label>
      <textarea
        id="notes"
        rows={5}
        disabled={isLoading}
        placeholder="Example: Sarah needs the Q3 roadmap by next Friday, and Noah should review the launch checklist this week."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p className="mt-2 text-xs text-slate-500">
        The assistant will infer owners, due dates, and urgency while keeping
        existing work visible.
      </p>
    </form>
  );
}
