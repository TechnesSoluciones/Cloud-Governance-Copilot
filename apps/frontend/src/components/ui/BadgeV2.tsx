/**
 * Badge V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Multiple variants (severity, provider, status)
 * - Multiple sizes
 * - Optional icons
 * - Customizable colors
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'aws'
  | 'azure'
  | 'gcp';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeV2Props {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string; // Material Symbol icon name
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  primary: 'bg-brand-primary-400/10 text-brand-primary-600 dark:text-brand-primary-400 border border-brand-primary-400/20',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  error: 'bg-error/10 text-error border border-error/20',
  info: 'bg-info/10 text-info border border-info/20',

  // Severity Badges
  critical: 'bg-error/10 text-error border border-error/20 font-semibold',
  high: 'bg-warning/10 text-warning border border-warning/20 font-semibold',
  medium: 'bg-info/10 text-info border border-info/20 font-semibold',
  low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',

  // Cloud Provider Badges
  aws: 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20 font-semibold',
  azure: 'bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20 font-semibold',
  gcp: 'bg-[#34A853]/10 text-[#34A853] border border-[#34A853]/20 font-semibold',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function BadgeV2({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: BadgeV2Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {icon && (
        <span className={cn('material-symbols-outlined', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm')}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
