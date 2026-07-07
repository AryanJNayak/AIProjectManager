interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        fill="none"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? 'Search tasks, owners, notes…'}
        className="w-full rounded-lg border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
      />
      {/* <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
        /
      </kbd> */}
    </div>
  );
}
