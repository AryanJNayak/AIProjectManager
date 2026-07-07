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
    <form className="card card-stack" onSubmit={handleSubmit}>
      <div className="card-heading">
        <div>
          <p className="eyebrow">AI intake</p>
          <h2>Turn meeting notes into action plans</h2>
        </div>
        <button className="btn btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? "Extracting…" : "Extract tasks"}
        </button>
      </div>
      <label className="field-label" htmlFor="notes">
        Paste notes, follow-ups, or project updates
      </label>
      <textarea
        id="notes"
        className="textarea"
        rows={8}
        placeholder="Example: Sarah needs the Q3 roadmap by next Friday, and Noah should review the launch checklist this week."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="helper-text">
        The assistant will infer owners, due dates, and urgency while keeping
        existing work visible.
      </p>
    </form>
  );
}
