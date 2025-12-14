/**
 * CardSkeleton Component
 *
 * Loading skeleton for card components including stat cards, info cards, and form cards.
 *
 * Features:
 * - Multiple card variants (stat, info, form, list)
 * - Configurable content rows
 * - Responsive design
 * - Matches card component styling
 * - Accessible loading state
 *
 * Usage:
 * ```tsx
 * <CardSkeleton variant="stat" />
 * <CardSkeleton variant="form" rows={5} />
 * ```
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
  /**
   * Card variant to render
   * @default 'default'
   */
  variant?: 'default' | 'stat' | 'form' | 'list' | 'compact';
  /**
   * Number of content rows to display
   * @default 3
   */
  rows?: number;
  /**
   * Whether to show icon/image area
   * @default true
   */
  showIcon?: boolean;
  /**
   * Whether to show actions/buttons area
   * @default false
   */
  showActions?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  variant = 'default',
  rows = 3,
  showIcon = true,
  showActions = false,
}) => {
  switch (variant) {
    case 'stat':
      return (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4"
          role="status"
          aria-label="Loading statistic card"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            {showIcon && <Skeleton className="h-12 w-12 rounded-lg" />}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
          <span className="sr-only">Loading statistic, please wait...</span>
        </div>
      );

    case 'form':
      return (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-6"
          role="status"
          aria-label="Loading form"
        >
          {/* Form Header */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>

          {/* Form Actions */}
          {showActions && (
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          )}

          <span className="sr-only">Loading form, please wait...</span>
        </div>
      );

    case 'list':
      return (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card"
          role="status"
          aria-label="Loading list"
        >
          {/* List Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-4">
                {showIcon && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
                {showActions && <Skeleton className="h-8 w-20" />}
              </div>
            ))}
          </div>

          <span className="sr-only">Loading list items, please wait...</span>
        </div>
      );

    case 'compact':
      return (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4 space-y-3"
          role="status"
          aria-label="Loading card"
        >
          <div className="flex items-center gap-3">
            {showIcon && <Skeleton className="h-8 w-8 rounded flex-shrink-0" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <span className="sr-only">Loading content, please wait...</span>
        </div>
      );

    case 'default':
    default:
      return (
        <div
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6 space-y-4"
          role="status"
          aria-label="Loading card"
        >
          {/* Header with icon/badge area */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            {showIcon && <Skeleton className="h-12 w-12 rounded-lg" />}
          </div>

          {/* Content rows */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 10}%` }} />
            ))}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          )}

          <span className="sr-only">Loading card content, please wait...</span>
        </div>
      );
  }
};

/**
 * CardGridSkeleton Component
 *
 * Grid of card skeletons
 */
interface CardGridSkeletonProps {
  /**
   * Number of cards to show
   * @default 6
   */
  count?: number;
  /**
   * Card variant
   */
  variant?: CardSkeletonProps['variant'];
  /**
   * Grid columns
   * @default 3
   */
  columns?: 1 | 2 | 3 | 4;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  variant = 'default',
  columns = 3,
}) => {
  const gridClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} variant={variant} rows={3} />
      ))}
    </div>
  );
};

/**
 * StatCardGridSkeleton Component
 *
 * Grid of stat card skeletons (common for KPI dashboards)
 */
interface StatCardGridSkeletonProps {
  /**
   * Number of stat cards
   * @default 4
   */
  count?: number;
}

export const StatCardGridSkeleton: React.FC<StatCardGridSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} variant="stat" />
      ))}
    </div>
  );
};

export default CardSkeleton;
