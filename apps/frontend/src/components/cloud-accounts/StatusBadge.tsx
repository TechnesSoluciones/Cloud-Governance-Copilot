'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'syncing';

export interface StatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
  showIcon?: boolean;
}

/**
 * Status badge with icons and semantic colors
 * Provides visual feedback for cloud account connection status
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showIcon = true,
}) => {
  const config = React.useMemo(() => {
    switch (status) {
      case 'active':
        return {
          label: 'Connected',
          variant: 'default' as const,
          className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
          icon: (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };

      case 'inactive':
        return {
          label: 'Inactive',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200',
          icon: (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          ),
        };

      case 'error':
        return {
          label: 'Error',
          variant: 'error' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
          icon: (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };

      case 'syncing':
        return {
          label: 'Syncing',
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
          icon: (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ),
        };

      default:
        return {
          label: 'Unknown',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-700',
          icon: null,
        };
    }
  }, [status]);

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1.5 font-medium border transition-colors',
        config.className,
        className
      )}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  );
};
