import * as React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
}

/**
 * Progress Component
 * A horizontal progress bar with customizable variants and optional label
 * Fully accessible with ARIA attributes
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value = 0, max = 100, variant = 'default', showLabel = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
    };

    return (
      <div className="space-y-1">
        {showLabel && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{value}</span>
            <span>{max}</span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${percentage.toFixed(0)}% complete`}
          className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
          {...props}
        >
          <div
            className={`h-full transition-all duration-300 ease-in-out ${variants[variant]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
