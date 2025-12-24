'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { HealthStatus } from '@/lib/api/dashboard';
import { formatDistanceToNow } from 'date-fns';

export interface RecentActivityProps {
  health: HealthStatus;
  maxItems?: number;
  className?: string;
}

/**
 * Get icon for change type
 */
const getChangeTypeIcon = (changeType: string) => {
  // Defensive programming: validate changeType before using toLowerCase
  if (!changeType || typeof changeType !== 'string') {
    return <Icons.activity className="h-4 w-4 text-slate-500" aria-hidden="true" />;
  }

  const type = changeType.toLowerCase();

  if (type.includes('create') || type.includes('add')) {
    return <Icons.plus className="h-4 w-4 text-green-500" aria-hidden="true" />;
  }

  if (type.includes('delete') || type.includes('remove')) {
    return <Icons.xCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
  }

  if (type.includes('update') || type.includes('modify') || type.includes('change')) {
    return <Icons.refresh className="h-4 w-4 text-blue-500" aria-hidden="true" />;
  }

  if (type.includes('start') || type.includes('run')) {
    return <Icons.checkCircle className="h-4 w-4 text-green-500" aria-hidden="true" />;
  }

  if (type.includes('stop') || type.includes('deallocate')) {
    return <Icons.alertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
  }

  return <Icons.activity className="h-4 w-4 text-slate-500" aria-hidden="true" />;
};

/**
 * Get badge variant for change type
 */
const getChangeTypeBadgeVariant = (changeType: string): 'success' | 'error' | 'warning' | 'info' | 'secondary' => {
  // Defensive programming: validate changeType before using toLowerCase
  if (!changeType || typeof changeType !== 'string') {
    return 'secondary';
  }

  const type = changeType.toLowerCase();

  if (type.includes('create') || type.includes('add') || type.includes('start')) {
    return 'success';
  }

  if (type.includes('delete') || type.includes('remove')) {
    return 'error';
  }

  if (type.includes('stop') || type.includes('deallocate')) {
    return 'warning';
  }

  if (type.includes('update') || type.includes('modify')) {
    return 'info';
  }

  return 'secondary';
};

/**
 * Extract resource name from resource ID
 * Azure resource IDs follow format: /subscriptions/{id}/resourceGroups/{rg}/providers/{provider}/{type}/{name}
 */
const getResourceName = (resourceId: string): string => {
  if (!resourceId) return 'Unknown Resource';

  const parts = resourceId.split('/');
  const name = parts[parts.length - 1];

  return name || resourceId;
};

/**
 * Format relative time with fallback
 */
const formatRelativeTime = (timestamp: Date | string): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Recently';
  }
};

/**
 * RecentActivity Component
 * Displays recent changes from Azure Resource Graph
 * Shows timestamp (relative), resource name, and change type
 * Limits to 10 most recent by default
 * Uses ScrollArea for vertical scrolling
 */
export const RecentActivity: React.FC<RecentActivityProps> = ({
  health,
  maxItems = 10,
  className = '',
}) => {
  // Sort by timestamp (newest first) and limit items
  const activities = React.useMemo(() => {
    // Defensive programming: validate data before processing
    if (!health?.recentActivity || !Array.isArray(health.recentActivity)) {
      return [];
    }

    return [...health.recentActivity]
      .filter((activity) => activity && activity.timestamp && activity.changeType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }, [health?.recentActivity, maxItems]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>
              Latest changes from Azure Resource Graph
            </CardDescription>
          </div>
          <Icons.clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icons.activity className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Resource changes will appear here
            </p>
          </div>
        ) : (
          <ScrollArea maxHeight="500px" className="pr-4">
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const resourceName = getResourceName(activity.resourceId);
                const relativeTime = formatRelativeTime(activity.timestamp);
                const icon = getChangeTypeIcon(activity.changeType);
                const badgeVariant = getChangeTypeBadgeVariant(activity.changeType);

                return (
                  <div
                    key={`${activity.resourceId}-${activity.timestamp}-${index}`}
                    className="flex items-start gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={badgeVariant} className="text-xs">
                          {activity.changeType}
                        </Badge>
                        <span
                          className="text-sm font-medium text-foreground truncate"
                          title={resourceName}
                        >
                          {resourceName}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Icons.clock className="h-3 w-3" aria-hidden="true" />
                        <time dateTime={new Date(activity.timestamp).toISOString()}>
                          {relativeTime}
                        </time>
                      </div>

                      {/* Full resource ID as tooltip-like element on hover */}
                      <details className="mt-1 group">
                        <summary className="text-xs text-primary cursor-pointer hover:underline list-none">
                          View Resource ID
                        </summary>
                        <p className="text-xs text-muted-foreground mt-1 break-all bg-slate-50 dark:bg-slate-900 p-2 rounded">
                          {activity.resourceId}
                        </p>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer with count */}
        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-muted-foreground text-center">
              Showing {activities.length} of {health?.recentActivity?.length || 0} recent changes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
