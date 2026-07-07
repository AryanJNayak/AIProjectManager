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
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onExtract();
  };

  return (
    <form
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
      onSubmit={handleSubmit}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
            AI intake
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            Turn meeting notes into action plans
          </h2>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Extracting…" : "Extract tasks"}
        </button>
      </div>
      <label htmlFor="notes" className="mb-1.5 block text-xs font-medium text-slate-400">
        Paste notes, follow-ups, or project updates
      </label>
      <textarea
        id="notes"
        rows={5}
        placeholder="Example: Sarah needs the Q3 roadmap by next Friday, and Noah should review the launch checklist this week."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
      />
      <p className="mt-2 text-xs text-slate-500">
        The assistant will infer owners, due dates, and urgency while keeping existing
        work visible.
      </p>
    </form>
  );
}
