'use client';

import * as React from 'react';
import { AuditEvent } from '@/components/dashboard/RecentActivity';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export interface AuditTableProps {
  logs: AuditEvent[];
  isLoading?: boolean;
  onSort?: (column: keyof AuditEvent, direction: 'asc' | 'desc') => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  logs,
  isLoading = false,
  onSort,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [sortColumn, setSortColumn] = React.useState<keyof AuditEvent>('timestamp');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const handleSort = (column: keyof AuditEvent) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

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

  const SortIcon: React.FC<{ column: keyof AuditEvent }> = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : (
        <>
          {/* Table */}
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <span className="sr-only">Expand</span>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('timestamp')}
                        className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                        aria-label="Sort by timestamp"
                      >
                        Timestamp
                        <SortIcon column="timestamp" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('user')}
                        className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                        aria-label="Sort by user"
                      >
                        User
                        <SortIcon column="user" />
                      </button>
                    </TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                        aria-label="Sort by status"
                      >
                        Status
                        <SortIcon column="status" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow className="group">
                      <TableCell>
                        <button
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                          className="rounded p-1 hover:bg-muted transition-colors"
                          aria-label={expandedRow === log.id ? 'Collapse details' : 'Expand details'}
                          aria-expanded={expandedRow === log.id}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${
                              expandedRow === log.id ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </TableCell>
                      <TableCell>
                        <time dateTime={log.timestamp} className="text-sm">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </time>
                      </TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell className="text-muted-foreground">{log.action}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground" title={log.resource}>
                        {log.resource}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="py-4 px-6 space-y-3">
                            <h4 className="font-semibold">Event Details</h4>
                            <dl className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Event ID</dt>
                                <dd className="text-sm font-mono">{log.id}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Timestamp</dt>
                                <dd className="text-sm">
                                  {new Date(log.timestamp).toLocaleString()}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">User</dt>
                                <dd className="text-sm">{log.user}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Action</dt>
                                <dd className="text-sm">{log.action}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-muted-foreground">Resource</dt>
                                <dd className="text-sm font-mono break-all">{log.resource}</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                                <dd className="text-sm">
                                  <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                >
                  Next
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
