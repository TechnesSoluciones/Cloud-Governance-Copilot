/**
 * IncidentsList Component
 * Displays incidents in a table with sorting, filtering, and pagination
 */

'use client';

import { Incident } from '@/lib/api/incidents';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { SeverityIndicator } from './SeverityIndicator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface IncidentsListProps {
  incidents: Incident[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onSort?: (field: 'severity' | 'createdAt' | 'updatedAt') => void;
  sortBy?: 'severity' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  className?: string;
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-8 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-64" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={5} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">No incidents found</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function IncidentsList({
  incidents,
  isLoading,
  pagination,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  className,
}: IncidentsListProps) {
  const router = useRouter();

  const handleRowClick = (incidentId: string) => {
    router.push(`/incidents/${incidentId}`);
  };

  const handleSort = (field: 'severity' | 'createdAt' | 'updatedAt') => {
    if (onSort) {
      onSort(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" aria-hidden="true" />;
    }
    return (
      <ArrowUpDown
        className={cn(
          'ml-2 h-4 w-4',
          sortOrder === 'asc' ? 'rotate-180' : '',
          'text-blue-600 dark:text-blue-500'
        )}
        aria-hidden="true"
      />
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                <button
                  onClick={() => handleSort('severity')}
                  className="flex items-center font-medium hover:text-blue-600 dark:hover:text-blue-500"
                  aria-label="Sort by severity"
                >
                  Severity
                  {getSortIcon('severity')}
                </button>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Resources</TableHead>
              <TableHead className="w-[180px]">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center font-medium hover:text-blue-600 dark:hover:text-blue-500"
                  aria-label="Sort by created date"
                >
                  Created
                  {getSortIcon('createdAt')}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingSkeleton />
            ) : incidents.length === 0 ? (
              <EmptyState />
            ) : (
              incidents.map(incident => (
                <TableRow
                  key={incident.id}
                  onClick={() => handleRowClick(incident.id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(incident.id);
                    }
                  }}
                  aria-label={`View incident: ${incident.title}`}
                >
                  <TableCell>
                    <SeverityIndicator severity={incident.severity} showText={false} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {incident.title}
                      </span>
                      {incident.description && (
                        <span className="line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
                          {incident.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <IncidentStatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {incident.affectedResourcesCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <time
                        dateTime={incident.createdAt}
                        title={format(new Date(incident.createdAt), 'PPpp')}
                        className="text-sm text-gray-900 dark:text-gray-100"
                      >
                        {formatDistanceToNow(new Date(incident.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                      {incident.assignedTo && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Assigned to {incident.assignedTo}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNumber: number;
                if (pagination.totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (pagination.page <= 3) {
                  pageNumber = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNumber = pagination.totalPages - 4 + i;
                } else {
                  pageNumber = pagination.page - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={pagination.page === pageNumber ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange?.(pageNumber)}
                    className="w-10"
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pagination.page === pageNumber ? 'page' : undefined}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
