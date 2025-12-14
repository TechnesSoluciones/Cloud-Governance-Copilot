/**
 * PageSkeleton Component
 *
 * Full page loading skeleton for initial page loads.
 * Displays a skeleton structure matching typical page layouts.
 *
 * Features:
 * - Responsive grid layout
 * - Header with title and actions area
 * - Filter/toolbar section
 * - KPI cards grid
 * - Content area (charts/tables)
 * - Matches app design system
 * - Accessible with ARIA labels
 *
 * Usage:
 * ```tsx
 * if (isLoading) {
 *   return <PageSkeleton />;
 * }
 * ```
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  /**
   * Whether to show KPI cards section
   * @default true
   */
  showKPIs?: boolean;
  /**
   * Number of KPI cards to show
   * @default 4
   */
  kpiCount?: number;
  /**
   * Whether to show chart section
   * @default true
   */
  showChart?: boolean;
  /**
   * Whether to show table section
   * @default true
   */
  showTable?: boolean;
  /**
   * Whether to show filters section
   * @default true
   */
  showFilters?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  showKPIs = true,
  kpiCount = 4,
  showChart = true,
  showTable = true,
  showFilters = true,
}) => {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" role="status" aria-label="Loading page content">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full lg:w-64" />
        </div>
      )}

      {/* KPI Cards Section */}
      {showKPIs && (
        <div
          className={`grid gap-4 md:grid-cols-2 ${
            kpiCount === 4 ? 'lg:grid-cols-4' : kpiCount === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
          }`}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Chart Section */}
      {showChart && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {/* Table Section */}
      {showTable && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 flex-1" />
              ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 pb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">Loading page content, please wait...</span>
    </div>
  );
};

export default PageSkeleton;
