import { useMemo, useState } from 'react';
import type { SortDirection, SortState } from '../types/task';

// ---------------------------------------------------------------------------
// Custom sort ranks
// Ascending order = lowest rank first.
// ---------------------------------------------------------------------------

/** Status ascending: To Do → In Progress → Done */
const STATUS_RANK: Record<string, number> = {
  'To Do': 0,
  'In Progress': 1,
  'Done': 2,
};

/** Priority ascending: Low → Medium → High */
const PRIORITY_RANK: Record<string, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

function getRank(key: string, value: string): number | null {
  if (key === 'status') return STATUS_RANK[value] ?? null;
  if (key === 'priority') return PRIORITY_RANK[value] ?? null;
  return null;
}

// ---------------------------------------------------------------------------

export function useSortableData<T extends Record<string, unknown>>(
  rows: T[],
  initialKey: keyof T | null = null,
) {
  const [sort, setSort] = useState<SortState<T>>({
    key: initialKey,
    direction: 'asc',
  });

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const key = sort.key as string;

    return [...rows].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Use rank-based comparison for status and priority
      const aRank = getRank(key, String(aVal));
      const bRank = getRank(key, String(bVal));

      let comparison = 0;
      if (aRank !== null && bRank !== null) {
        comparison = aRank - bRank;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, sort]);

  const toggleSort = (key: keyof T) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' as SortDirection };
      return {
        key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  return { sortedRows, sort, toggleSort };
}
