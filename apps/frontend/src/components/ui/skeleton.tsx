import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Base Skeleton Component
 * A simple loading placeholder with pulse animation
 * Works with dark mode via Tailwind's dark: prefix
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
      {...props}
    />
  )
);

Skeleton.displayName = 'Skeleton';

/**
 * CardSkeleton Component
 * Mimics the structure of a stat card or info card
 * Includes header, title, description, and content rows
 */
export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4">
    {/* Header with icon/badge area */}
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-12 w-12 rounded-lg" />
    </div>
    {/* Content rows */}
    <div className="space-y-3 pt-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  </div>
);

/**
 * StatCardSkeleton Component
 * Mimics KPI/stat cards with value display
 */
export const StatCardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-12 w-12 rounded-lg" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
);

/**
 * TableSkeleton Component
 * Mimics a data table with header row and data rows
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card overflow-hidden">
    {/* Header row */}
    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 p-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-5 flex-1" />
      ))}
    </div>
    {/* Data rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex gap-4 border-b border-slate-200 dark:border-slate-700 p-4 last:border-b-0"
      >
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * ListSkeleton Component
 * Mimics a list of items with varied content
 */
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * FormSkeleton Component
 * Mimics a form with labeled input fields
 */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="pt-4 space-y-2">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

/**
 * RecentActivitySkeleton Component
 * Mimics recent activity list with timestamps and status badges
 */
export const RecentActivitySkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6">
    <Skeleton className="h-6 w-40 mb-6" />
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-24 flex-shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * GridCardsSkeleton Component
 * Mimics a grid of cards (e.g., cloud accounts, recommendations)
 */
export const GridCardsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} rows={3} />
    ))}
  </div>
);

/**
 * StatCardGridSkeleton Component
 * Mimics a grid of stat/KPI cards
 */
export const StatCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

export { Skeleton };
