'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  status: 'success' | 'failure' | 'pending';
}

export interface RecentActivityProps {
  events?: AuditEvent[];
  isLoading?: boolean;
  maxEvents?: number;
  onViewAll?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  events = [],
  isLoading = false,
  maxEvents = 10,
  onViewAll,
}) => {
  const displayEvents = events.slice(0, maxEvents);

  const getStatusColor = (status: AuditEvent['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your cloud accounts</CardDescription>
          </div>
          {onViewAll && events.length > 0 && (
            <button
              onClick={onViewAll}
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
              aria-label="View all activity"
            >
              View all
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : displayEvents.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
            title="No recent activity"
            description="Activity from your cloud accounts will appear here"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Resource</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-sm">
                      <time dateTime={event.timestamp}>
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </time>
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium">{event.user}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{event.action}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground truncate max-w-xs">
                      {event.resource}
                    </td>
                    <td className="py-3">
                      <Badge
                        className={getStatusColor(event.status)}
                        aria-label={`Status: ${event.status}`}
                      >
                        {event.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
