import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
  icon,
  align = 'left',
}: SortableTableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  
  const alignClass = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  }[align];

  return (
    <th
      className={cn(
        'py-2 font-medium cursor-pointer hover:bg-muted/50 transition-colors select-none',
        alignClass,
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className={cn('flex items-center gap-1', alignClass)}>
        {icon}
        {label}
        <span className="ml-1">
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </span>
      </span>
    </th>
  );
}

// Helper function to sort data
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig,
  getValueFn: (item: T, key: string) => any
): T[] {
  if (!sortConfig.key || !sortConfig.direction) return data;

  return [...data].sort((a, b) => {
    const aValue = getValueFn(a, sortConfig.key);
    const bValue = getValueFn(b, sortConfig.key);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

    // String comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    // Number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Boolean comparison
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      const comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    return 0;
  });
}

// Hook for managing sort state
export function useTableSort(defaultKey?: string, defaultDirection: SortDirection = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultKey || '',
    direction: defaultDirection,
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      if (current.direction === 'desc') {
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  return { sortConfig, handleSort };
}
