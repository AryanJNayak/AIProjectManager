import { useMemo, useState } from 'react';
import type { SortDirection, SortState } from '../types/task';

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
    const key = sort.key;

    return [...rows].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
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
