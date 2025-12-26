/**
 * KPI Card V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Icon badge with customizable color
 * - Large value display
 * - Trend indicator (up/down with percentage)
 * - Comparison text
 * - Progress bar (optional)
 * - Multiple color variants
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KPICardVariant = 'blue' | 'emerald' | 'indigo' | 'orange' | 'red' | 'purple';

export interface KPICardProps {
  icon: string; // Material Symbol icon name
  label: string;
  value: string | number;
  variant?: KPICardVariant;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
    label?: string;
  };
  comparison?: string;
  progress?: {
    current: number;
    max: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<KPICardVariant, { bg: string; text: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
  orange: {
    bg: 'bg-brand-primary-400/10',
    text: 'text-brand-primary-600 dark:text-brand-primary-400',
    icon: 'text-brand-primary-600 dark:text-brand-primary-400',
  },
  red: {
    bg: 'bg-error/10',
    text: 'text-error',
    icon: 'text-error',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-600 dark:text-purple-400',
  },
};

export function KPICardV2({
  icon,
  label,
  value,
  variant = 'blue',
  trend,
  comparison,
  progress,
  className,
  onClick,
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-card-dark rounded-xl p-5',
        'border border-slate-200 dark:border-slate-800',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
    >
      {/* Header: Icon + Label */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-lg', styles.bg)}>
            <span className={cn('material-symbols-outlined text-2xl', styles.icon)}>{icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          </div>
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold',
              trend.direction === 'up'
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            )}
          >
            <span className="material-symbols-outlined text-base">
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>

      {/* Value Display */}
      <div className="mb-2">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        {comparison && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{comparison}</p>
        )}
        {trend?.label && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{trend.label}</p>
        )}
      </div>

      {/* Progress Bar (Optional) */}
      {progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>{progress.label || 'Progress'}</span>
            <span>
              {progress.current} / {progress.max}
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', styles.text.replace('text-', 'bg-'))}
              style={{ width: `${(progress.current / progress.max) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
