/**
 * Status Indicator V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Colored dot indicator
 * - Label and details text
 * - Optional icon
 * - Multiple status types
 */

'use client';

import { cn } from '@/lib/utils';

export type StatusType = 'operational' | 'degraded' | 'warning' | 'critical' | 'maintenance';

export interface StatusIndicatorV2Props {
  status: StatusType;
  label: string;
  details?: string;
  icon?: string; // Material Symbol icon name
  className?: string;
}

const statusStyles: Record<StatusType, { dot: string; text: string }> = {
  operational: {
    dot: 'bg-success',
    text: 'text-success',
  },
  degraded: {
    dot: 'bg-warning',
    text: 'text-warning',
  },
  warning: {
    dot: 'bg-warning',
    text: 'text-warning',
  },
  critical: {
    dot: 'bg-error',
    text: 'text-error',
  },
  maintenance: {
    dot: 'bg-info',
    text: 'text-info',
  },
};

export function StatusIndicatorV2({
  status,
  label,
  details,
  icon,
  className,
}: StatusIndicatorV2Props) {
  const styles = statusStyles[status];

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Status Dot or Icon */}
      <div className="flex-shrink-0 mt-1">
        {icon ? (
          <span className={cn('material-symbols-outlined text-xl', styles.text)}>{icon}</span>
        ) : (
          <div className="relative">
            <div className={cn('w-2.5 h-2.5 rounded-full', styles.dot)} />
            <div className={cn('absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-75', styles.dot)} />
          </div>
        )}
      </div>

      {/* Label and Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        {details && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{details}</p>
        )}
      </div>
    </div>
  );
}
