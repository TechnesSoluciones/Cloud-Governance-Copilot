/**
 * IncidentStatusBadge Component
 * Displays incident status with appropriate color coding
 */

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { IncidentStatus } from '@/lib/api/incidents';
import { cn } from '@/lib/utils';

interface IncidentStatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

const statusConfig: Record<
  IncidentStatus,
  {
    label: string;
    variant: NonNullable<BadgeProps['variant']>;
    className: string;
  }
> = {
  new: {
    label: 'New',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  acknowledged: {
    label: 'Acknowledged',
    variant: 'secondary',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  investigating: {
    label: 'Investigating',
    variant: 'default',
    className: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  resolved: {
    label: 'Resolved',
    variant: 'success',
    className: 'bg-green-500 hover:bg-green-600 text-white',
  },
  closed: {
    label: 'Closed',
    variant: 'secondary',
    className: 'bg-gray-500 hover:bg-gray-600 text-white dark:bg-gray-600 dark:hover:bg-gray-700',
  },
} as const;

export function IncidentStatusBadge({ status, className }: IncidentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
