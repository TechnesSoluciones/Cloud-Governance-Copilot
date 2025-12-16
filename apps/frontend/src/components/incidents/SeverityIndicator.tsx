/**
 * SeverityIndicator Component
 * Displays severity level with icon, color, and text
 */

import { IncidentSeverity } from '@/lib/api/incidents';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeverityIndicatorProps {
  severity: IncidentSeverity;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const severityConfig: Record<
  IncidentSeverity,
  {
    label: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
  }
> = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    colorClass: 'text-red-600 dark:text-red-500',
    bgClass: 'bg-red-100 dark:bg-red-900/20',
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    colorClass: 'text-orange-600 dark:text-orange-500',
    bgClass: 'bg-orange-100 dark:bg-orange-900/20',
  },
  medium: {
    label: 'Medium',
    icon: Info,
    colorClass: 'text-yellow-600 dark:text-yellow-500',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  low: {
    label: 'Low',
    icon: CheckCircle,
    colorClass: 'text-blue-600 dark:text-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900/20',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-4 w-4',
    text: 'text-xs',
    padding: 'px-2 py-1',
  },
  md: {
    icon: 'h-5 w-5',
    text: 'text-sm',
    padding: 'px-3 py-1.5',
  },
  lg: {
    icon: 'h-6 w-6',
    text: 'text-base',
    padding: 'px-4 py-2',
  },
};

export function SeverityIndicator({
  severity,
  showText = true,
  size = 'md',
  className,
}: SeverityIndicatorProps) {
  const config = severityConfig[severity];
  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  if (showText) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-md font-medium',
          config.bgClass,
          config.colorClass,
          sizeClasses.padding,
          className
        )}
        aria-label={`Severity: ${config.label}`}
      >
        <Icon className={sizeClasses.icon} aria-hidden="true" />
        <span className={sizeClasses.text}>{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn('inline-flex items-center', config.colorClass, className)}
      aria-label={`Severity: ${config.label}`}
      title={config.label}
    >
      <Icon className={sizeClasses.icon} aria-hidden="true" />
    </div>
  );
}
