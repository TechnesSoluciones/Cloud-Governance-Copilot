/**
 * ChartSkeleton Component
 *
 * Loading skeleton for charts and graphs.
 *
 * Features:
 * - Multiple chart type variants (line, bar, pie, area)
 * - Chart header with title and controls
 * - Legend section
 * - Responsive design
 * - Matches chart component styling
 * - Accessible loading state
 *
 * Usage:
 * ```tsx
 * <ChartSkeleton type="line" />
 * <ChartSkeleton type="pie" showLegend />
 * ```
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartSkeletonProps {
  /**
   * Type of chart to simulate
   * @default 'line'
   */
  type?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  /**
   * Whether to show legend
   * @default true
   */
  showLegend?: boolean;
  /**
   * Whether to show chart header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show chart controls/filters
   * @default true
   */
  showControls?: boolean;
  /**
   * Chart height
   * @default 'md' (320px)
   */
  height?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to wrap in a card container
   * @default true
   */
  withCard?: boolean;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'line',
  showLegend = true,
  showHeader = true,
  showControls = true,
  height = 'md',
  withCard = true,
}) => {
  const heightClasses = {
    sm: 'h-48',
    md: 'h-80',
    lg: 'h-96',
    xl: 'h-[28rem]',
  };

  const renderChartContent = () => {
    switch (type) {
      case 'pie':
      case 'donut':
        return (
          <div className="flex items-center justify-center gap-8">
            {/* Pie/Donut Circle */}
            <div className="relative flex items-center justify-center">
              <Skeleton
                className={`${
                  height === 'sm' ? 'h-32 w-32' : height === 'md' ? 'h-48 w-48' : 'h-64 w-64'
                } rounded-full`}
              />
              {type === 'donut' && (
                <Skeleton
                  className={`absolute ${
                    height === 'sm' ? 'h-16 w-16' : height === 'md' ? 'h-24 w-24' : 'h-32 w-32'
                  } rounded-full bg-white dark:bg-slate-950`}
                />
              )}
            </div>
            {/* Legend for pie charts */}
            {showLegend && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'bar':
        return (
          <div className="flex items-end justify-between gap-2 px-4 pb-4 pt-8 h-full">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-md"
                style={{
                  height: `${Math.random() * 60 + 40}%`,
                }}
              />
            ))}
          </div>
        );

      case 'line':
      case 'area':
      default:
        return (
          <div className="relative h-full p-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
            {/* Chart area */}
            <div className="ml-12 h-full flex flex-col">
              <div className="flex-1 relative">
                <Skeleton className="absolute inset-0" />
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between pt-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-12" />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const chartContent = (
    <div role="status" aria-label="Loading chart data">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          {showControls && (
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className={heightClasses[height]}>{renderChartContent()}</div>

      {/* Bottom Legend for line/bar charts */}
      {showLegend && (type === 'line' || type === 'bar' || type === 'area') && (
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">Loading chart data, please wait...</span>
    </div>
  );

  if (withCard) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-6">
        {chartContent}
      </div>
    );
  }

  return chartContent;
};

/**
 * MultiChartSkeleton Component
 *
 * Multiple charts in a grid layout
 */
interface MultiChartSkeletonProps {
  /**
   * Number of charts to show
   * @default 2
   */
  count?: number;
  /**
   * Chart type for all charts
   */
  type?: ChartSkeletonProps['type'];
  /**
   * Grid columns
   * @default 2
   */
  columns?: 1 | 2 | 3;
}

export const MultiChartSkeleton: React.FC<MultiChartSkeletonProps> = ({
  count = 2,
  type = 'line',
  columns = 2,
}) => {
  const gridClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
      ? 'grid-cols-1 lg:grid-cols-3'
      : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} type={type} height="md" />
      ))}
    </div>
  );
};

export default ChartSkeleton;
