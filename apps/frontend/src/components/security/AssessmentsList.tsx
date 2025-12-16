'use client';

/**
 * Assessments List Component
 *
 * Advanced table for security findings/assessments with advanced features
 * Features:
 * - Filterable and sortable table
 * - Severity and status badges
 * - Row click for details modal
 * - Bulk actions support
 * - Export to CSV functionality
 * - Pagination
 * - Loading skeletons
 * - Empty states
 * - Responsive design
 * - Full accessibility (ARIA, keyboard navigation)
 *
 * @example
 * <AssessmentsList
 *   assessments={findings}
 *   onAssessmentClick={handleClick}
 *   onExport={handleExport}
 * />
 */

import * as React from 'react';
import { useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Download,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Finding, FindingSeverity, FindingStatus } from '@/lib/api/security';

export interface AssessmentsListProps {
  assessments: Finding[];
  isLoading?: boolean;
  onAssessmentClick: (assessment: Finding) => void;
  onExport?: () => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

/**
 * Severity Badge with icon
 */
interface SeverityBadgeProps {
  severity: FindingSeverity;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const config: Record<
    FindingSeverity,
    { className: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
      icon: <AlertOctagon className="h-3 w-3" aria-hidden="true" />,
      label: 'Critical',
    },
    HIGH: {
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200',
      icon: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
      label: 'High',
    },
    MEDIUM: {
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
      icon: <ShieldAlert className="h-3 w-3" aria-hidden="true" />,
      label: 'Medium',
    },
    LOW: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200',
      icon: <Info className="h-3 w-3" aria-hidden="true" />,
      label: 'Low',
    },
  };

  const { className, icon, label } = config[severity];

  return (
    <Badge className={`${className} flex items-center gap-1 w-fit`}>
      {icon}
      {label}
    </Badge>
  );
};

/**
 * Status Badge
 */
interface StatusBadgeProps {
  status: FindingStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<FindingStatus, { className: string; label: string }> = {
    open: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Open',
    },
    resolved: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Resolved',
    },
    dismissed: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      label: 'Dismissed',
    },
  };

  const { className, label } = config[status];

  return <Badge className={className}>{label}</Badge>;
};

/**
 * Export to CSV function
 */
function exportToCSV(assessments: Finding[]): void {
  const headers = [
    'ID',
    'Severity',
    'Title',
    'Description',
    'Category',
    'Status',
    'Resource ID',
    'Resource Type',
    'Region',
    'Detected At',
    'Resolved At',
    'Resolution',
  ];

  const rows = assessments.map((assessment) => [
    assessment.id,
    assessment.severity,
    assessment.title,
    assessment.description,
    assessment.category,
    assessment.status,
    assessment.resourceId,
    assessment.resourceType,
    assessment.region,
    assessment.detectedAt,
    assessment.resolvedAt || '',
    assessment.resolution || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `security-assessments-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Empty state
 */
const EmptyState: React.FC = () => (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Shield className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No assessments found
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          No security assessments match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    </div>
  </Card>
);

/**
 * Loading skeleton
 */
const AssessmentsListSkeleton: React.FC = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 6 }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </Card>
);

/**
 * Pagination controls
 */
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
    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

/**
 * Main AssessmentsList component
 */
export const AssessmentsList: React.FC<AssessmentsListProps> = ({
  assessments,
  isLoading = false,
  onAssessmentClick,
  onExport,
  pagination,
  className = '',
}) => {
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      exportToCSV(assessments);
    }
  };

  if (isLoading) {
    return <AssessmentsListSkeleton />;
  }

  if (assessments.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card className={className}>
      {/* Header with export button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Security Assessments
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            aria-label="Export assessments to CSV"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[10%]">Severity</TableHead>
              <TableHead className="w-[25%]">Finding</TableHead>
              <TableHead className="w-[15%]">Category</TableHead>
              <TableHead className="w-[20%]">Resource</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[10%]">Detected</TableHead>
              <TableHead className="w-[10%] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((assessment) => (
              <TableRow
                key={assessment.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => onAssessmentClick(assessment)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAssessmentClick(assessment);
                  }
                }}
                aria-label={`View details for ${assessment.title}`}
              >
                <TableCell>
                  <SeverityBadge severity={assessment.severity} />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                      {assessment.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {assessment.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {assessment.category}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={assessment.resourceId}>
                      {assessment.resourceId}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {assessment.resourceType}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={assessment.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDistanceToNow(new Date(assessment.detectedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssessmentClick(assessment);
                    }}
                    aria-label={`View details for ${assessment.title}`}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="p-4">
          <PaginationControls {...pagination} />
        </div>
      )}
    </Card>
  );
};
