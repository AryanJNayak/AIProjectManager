import type { SortDirection } from '../types/task';

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right';
}

export function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: SortableHeaderProps) {
  return (
    <th
      scope="col"
      className={`select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`group inline-flex items-center gap-1.5 rounded transition-colors ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <span>{label}</span>
        <span className="flex flex-col leading-none">
          <svg
            viewBox="0 0 8 5"
            className={`h-[5px] w-2 transition-colors ${
              active && direction === 'asc'
                ? 'fill-teal-300'
                : 'fill-slate-600 group-hover:fill-slate-400'
            }`}
          >
            <path d="M4 0L8 5H0L4 0Z" />
          </svg>
          <svg
            viewBox="0 0 8 5"
            className={`mt-[3px] h-[5px] w-2 transition-colors ${
              active && direction === 'desc'
                ? 'fill-teal-300'
                : 'fill-slate-600 group-hover:fill-slate-400'
            }`}
          >
            <path d="M4 5L0 0H8L4 5Z" />
          </svg>
        </span>
      </button>
    </th>
  );
}
