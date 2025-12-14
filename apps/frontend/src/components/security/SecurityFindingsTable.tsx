'use client';

/**
 * Security Findings Table Component
 *
 * Displays security findings in a sortable, interactive table format
 * Features:
 * - Sortable columns
 * - Row click for details
 * - Severity badges with color coding (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=gray)
 * - Status badges
 * - Date formatting
 * - Loading skeletons
 * - Empty states
 * - Pagination controls
 * - Responsive design
 * - Accessibility features
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Finding, FindingSeverity, FindingStatus } from '@/lib/api/security';

// Severity Badge Component
interface SeverityBadgeProps {
  severity: FindingSeverity;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const variants: Record<
    FindingSeverity,
    { className: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
      icon: <AlertOctagon className="h-3 w-3" aria-hidden="true" />,
      label: 'Critical',
    },
    HIGH: {
      className:
        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200',
      icon: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
      label: 'High',
    },
    MEDIUM: {
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
      icon: <ShieldAlert className="h-3 w-3" aria-hidden="true" />,
      label: 'Medium',
    },
    LOW: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200',
      icon: <Info className="h-3 w-3" aria-hidden="true" />,
      label: 'Low',
    },
  };

  const config = variants[severity];

  return (
    <Badge variant="default" className={`${config.className} flex items-center gap-1 w-fit`}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: FindingStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<
    FindingStatus,
    { variant: 'default' | 'success' | 'secondary'; label: string; className?: string }
  > = {
    open: {
      variant: 'default',
      label: 'Open',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    resolved: {
      variant: 'success',
      label: 'Resolved',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    dismissed: {
      variant: 'secondary',
      label: 'Dismissed',
    },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

// Empty State Component
const EmptyState: React.FC = () => (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Shield className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No findings found
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Run a security scan to identify potential security issues or adjust your filters to see
          more results.
        </p>
      </div>
    </div>
  </Card>
);

// Loading Skeleton Component
const TableSkeleton: React.FC = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 flex-1" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </Card>
);

// Pagination Controls Component
interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber: number;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (page <= 3) {
                pageNumber = i + 1;
              } else if (page >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = page - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={page === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="min-w-[2.5rem]"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Main Component Props
export interface SecurityFindingsTableProps {
  findings: Finding[];
  isLoading: boolean;
  onFindingClick: (finding: Finding) => void;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * Security Findings Table
 * Displays findings with sorting, filtering, and pagination
 */
export const SecurityFindingsTable: React.FC<SecurityFindingsTableProps> = ({
  findings,
  isLoading,
  onFindingClick,
  pagination,
}) => {
  // Loading State
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Empty State
  if (findings.length === 0) {
    return <EmptyState />;
  }

  // Main Table
  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12%]">Severity</TableHead>
                <TableHead className="w-[25%]">Title</TableHead>
                <TableHead className="w-[15%]">Category</TableHead>
                <TableHead className="w-[12%]">Cloud Account</TableHead>
                <TableHead className="w-[15%]">Resource</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[11%]">Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((finding) => (
                <TableRow
                  key={finding.id}
                  onClick={() => onFindingClick(finding)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onFindingClick(finding);
                    }
                  }}
                  aria-label={`View details for ${finding.title}`}
                >
                  <TableCell>
                    <SeverityBadge severity={finding.severity} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="line-clamp-2" title={finding.title}>
                      {finding.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {finding.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate block max-w-[150px]" title={finding.cloudAccountId}>
                      {finding.cloudAccountId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={finding.resourceId}>
                        {finding.resourceId}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {finding.resourceType}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDistanceToNow(new Date(finding.detectedAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PaginationControls {...pagination} />
    </>
  );
};
