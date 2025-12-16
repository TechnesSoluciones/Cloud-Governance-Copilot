/**
 * IncidentTimeline Component
 * Displays incident timeline events in vertical timeline format
 */

import { TimelineEvent, EventType } from '@/lib/api/incidents';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCircle,
  MessageCircle,
  AlertTriangle,
  UserCheck,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const eventTypeConfig: Record<
  EventType,
  {
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
  }
> = {
  alert_fired: {
    icon: Bell,
    colorClass: 'text-red-600 dark:text-red-500',
    bgClass: 'bg-red-100 dark:bg-red-900/20',
  },
  status_changed: {
    icon: Activity,
    colorClass: 'text-blue-600 dark:text-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900/20',
  },
  comment_added: {
    icon: MessageCircle,
    colorClass: 'text-purple-600 dark:text-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-900/20',
  },
  resource_affected: {
    icon: AlertTriangle,
    colorClass: 'text-orange-600 dark:text-orange-500',
    bgClass: 'bg-orange-100 dark:bg-orange-900/20',
  },
  resolved: {
    icon: CheckCircle,
    colorClass: 'text-green-600 dark:text-green-500',
    bgClass: 'bg-green-100 dark:bg-green-900/20',
  },
  assigned: {
    icon: UserCheck,
    colorClass: 'text-indigo-600 dark:text-indigo-500',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/20',
  },
};

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;

  const relativeTime = formatDistanceToNow(new Date(event.timestamp), {
    addSuffix: true,
  });

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-4 top-8 h-full w-0.5 bg-gray-200 dark:bg-gray-700"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          config.bgClass
        )}
        aria-label={`Event type: ${event.type}`}
      >
        <Icon className={cn('h-4 w-4', config.colorClass)} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {event.title}
            </h4>
            {event.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {event.description}
              </p>
            )}
            {event.actor && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                by {event.actor}
              </p>
            )}
          </div>
          <time
            className="shrink-0 text-xs text-gray-500 dark:text-gray-500"
            dateTime={event.timestamp}
            title={new Date(event.timestamp).toLocaleString()}
          >
            {relativeTime}
          </time>
        </div>

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <dl className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="font-medium">{key}:</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

export function IncidentTimeline({ events, className }: IncidentTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/50',
          className
        )}
      >
        <Activity className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          No timeline events available
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} role="list" aria-label="Incident timeline">
      {events.map((event, index) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={index === events.length - 1}
        />
      ))}
    </div>
  );
}
