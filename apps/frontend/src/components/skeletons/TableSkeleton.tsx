/**
 * TableSkeleton Component
 *
 * Loading skeleton for data tables with customizable rows and columns.
 *
 * Features:
 * - Configurable number of rows and columns
 * - Header row with sorting indicators
 * - Optional checkbox column for row selection
 * - Responsive design
 * - Matches table component styling
 * - Accessible loading state
 *
 * Usage:
 * ```tsx
 * <TableSkeleton rows={10} columns={6} showCheckbox />
 * ```
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  /**
   * Number of data rows to display
   * @default 5
   */
  rows?: number;
  /**
   * Number of columns to display
   * @default 4
   */
  columns?: number;
  /**
   * Whether to show checkbox column for selection
   * @default false
   */
  showCheckbox?: boolean;
  /**
   * Whether to show the table header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Custom header labels (if not provided, uses skeleton)
   */
  headerLabels?: string[];
  /**
   * Whether to wrap in a card container
   * @default true
   */
  withCard?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showCheckbox = false,
  showHeader = true,
  headerLabels,
  withCard = true,
}) => {
  const totalColumns = showCheckbox ? columns + 1 : columns;

  const tableContent = (
    <div className="w-full" role="status" aria-label="Loading table data">
      {/* Header Row */}
      {showHeader && (
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
          {showCheckbox && (
            <div className="flex items-center justify-center w-8">
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          )}
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              {headerLabels && headerLabels[i] ? (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {headerLabels[i]}
                </span>
              ) : (
                <Skeleton className="h-5 w-full max-w-[120px]" />
              )}
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      )}

      {/* Data Rows */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
          >
            {showCheckbox && (
              <div className="flex items-center justify-center w-8">
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            )}
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <Skeleton
                  className={`h-4 ${
                    colIndex === 0
                      ? 'w-3/4'
                      : colIndex === columns - 1
                      ? 'w-1/2'
                      : 'w-full'
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading table data, please wait...</span>
    </div>
  );

  if (withCard) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card overflow-hidden">
        {tableContent}
      </div>
    );
  }

  return tableContent;
};

/**
 * TableSkeletonWithFilters Component
 *
 * Table skeleton with filter bar above it
 */
interface TableSkeletonWithFiltersProps extends TableSkeletonProps {
  /**
   * Number of filter controls to show
   * @default 3
   */
  filterCount?: number;
}

export const TableSkeletonWithFilters: React.FC<TableSkeletonWithFiltersProps> = ({
  filterCount = 3,
  ...tableProps
}) => {
  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-full sm:w-64" />
          {Array.from({ length: filterCount - 1 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full sm:w-40" />
          ))}
        </div>
      </div>

      {/* Table */}
      <TableSkeleton {...tableProps} />

      {/* Pagination */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
