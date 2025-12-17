/**
 * AlertDetailModal Component
 * Displays alert details in a slide-in modal
 */

'use client';

import { Alert } from '@/lib/api/incidents';
import { SeverityIndicator } from './SeverityIndicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  ExternalLink,
  CheckCircle,
  BellOff,
  Server,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertDetailModalProps {
  alert: Alert | null;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (alertId: string) => void;
  onSuppress?: (alertId: string) => void;
  className?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function AlertDetailModal({
  alert,
  isLoading,
  isOpen,
  onClose,
  onResolve,
  onSuppress,
  className,
}: AlertDetailModalProps) {
  const handleResolve = () => {
    if (alert && onResolve) {
      onResolve(alert.id);
    }
  };

  const handleSuppress = () => {
    if (alert && onSuppress) {
      onSuppress(alert.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: 'Active',
        className: 'bg-red-500 hover:bg-red-600 text-white',
      },
      resolved: {
        label: 'Resolved',
        className: 'bg-green-500 hover:bg-green-600 text-white',
      },
      suppressed: {
        label: 'Suppressed',
        className: 'bg-gray-500 hover:bg-gray-600 text-white',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

    return (
      <Badge className={config.className} aria-label={`Status: ${config.label}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'max-h-[90vh] max-w-2xl',
          'sm:slide-in-from-right',
          className
        )}
        aria-describedby="alert-description"
      >
        {isLoading ? (
          <LoadingSkeleton />
        ) : alert ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <DialogTitle className="text-xl font-semibold">
                    {alert.name}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityIndicator severity={alert.severity} size="sm" />
                    {getStatusBadge(alert.status)}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div id="alert-description" className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Description
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {alert.description}
                  </p>
                </div>

                {/* Resource Information */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Server className="h-4 w-4" aria-hidden="true" />
                    Affected Resource
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-600 dark:text-gray-400">Name:</dt>
                        <dd className="text-gray-900 dark:text-gray-100">
                          {alert.resourceName}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-600 dark:text-gray-400">Type:</dt>
                        <dd className="text-gray-900 dark:text-gray-100">
                          {alert.resourceType}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-600 dark:text-gray-400">ID:</dt>
                        <dd className="font-mono text-xs text-gray-900 dark:text-gray-100">
                          {alert.resourceId}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Timeline
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-600 dark:text-gray-400">
                        Fired At:
                      </dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        <time dateTime={alert.firedAt}>
                          {format(new Date(alert.firedAt), 'PPpp')}
                        </time>
                      </dd>
                    </div>
                    {alert.resolvedAt && (
                      <div className="flex justify-between">
                        <dt className="font-medium text-gray-600 dark:text-gray-400">
                          Resolved At:
                        </dt>
                        <dd className="text-gray-900 dark:text-gray-100">
                          <time dateTime={alert.resolvedAt}>
                            {format(new Date(alert.resolvedAt), 'PPpp')}
                          </time>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Metadata */}
                {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Additional Information
                    </h3>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                      <dl className="space-y-1 text-sm">
                        {Object.entries(alert.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <dt className="font-medium text-gray-600 dark:text-gray-400">
                              {key}:
                            </dt>
                            <dd className="text-gray-900 dark:text-gray-100">
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              {alert.status === 'active' && (
                <>
                  <Button
                    onClick={handleResolve}
                    className="flex-1"
                    disabled={!onResolve}
                    aria-label="Resolve alert"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Resolve
                  </Button>
                  <Button
                    onClick={handleSuppress}
                    variant="outline"
                    className="flex-1"
                    disabled={!onSuppress}
                    aria-label="Suppress alert"
                  >
                    <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
                    Suppress
                  </Button>
                </>
              )}
              <a
                href={`https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/AzureMonitoringBrowseBlade/alertId/${alert.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
                aria-label="View in Azure Monitor"
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                View in Azure Monitor
              </a>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No alert data available
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
