/**
 * RecommendationsList Component
 *
 * Displays Azure Advisor recommendations in a sortable, paginated table.
 *
 * Features:
 * - Sortable columns
 * - Click row to view details
 * - Action buttons (View, Suppress, Dismiss)
 * - Pagination (50 items per page)
 * - Loading skeletons
 * - Empty state
 * - Responsive design
 * - Accessibility support
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AdvisorRecommendationDTO,
  RecommendationFilters,
  formatCurrency,
  formatRelativeDate,
} from '@/types/azure-advisor';
import { CategoryBadge, ImpactBadge, StatusBadge } from './CategoryBadge';

export interface RecommendationsListProps {
  recommendations: AdvisorRecommendationDTO[];
  isLoading?: boolean;
  onViewDetails: (recommendation: AdvisorRecommendationDTO) => void;
  onSuppress: (recommendation: AdvisorRecommendationDTO) => void;
  onDismiss: (recommendation: AdvisorRecommendationDTO) => void;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sortBy?: 'lastUpdated' | 'impact' | 'category' | 'savings';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: 'lastUpdated' | 'impact' | 'category' | 'savings', sortOrder: 'asc' | 'desc') => void;
}

/**
 * Column Definition
 */
interface Column {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: 'category', label: 'Category', sortable: true, width: 'w-32' },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'resource', label: 'Resource', sortable: false, width: 'w-48' },
  { key: 'impact', label: 'Impact', sortable: true, width: 'w-24' },
  { key: 'savings', label: 'Potential Savings', sortable: true, width: 'w-32' },
  { key: 'status', label: 'Status', sortable: false, width: 'w-28' },
  { key: 'actions', label: 'Actions', sortable: false, width: 'w-40' },
];

/**
 * Table Skeleton
 */
function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <TableHead key={col.key} className={col.width}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {COLUMNS.map((col) => (
              <TableCell key={col.key}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Empty State
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Eye className="h-8 w-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No recommendations found
      </h3>
      <p className="text-sm text-gray-600 max-w-md">
        There are no recommendations matching your current filters. Try adjusting
        your filters or check back later.
      </p>
    </div>
  );
}

/**
 * Sort Icon Component
 */
function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  if (sortBy !== column) {
    return <ArrowUpDown className="h-3 w-3 ml-1 inline-block opacity-30" />;
  }

  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 ml-1 inline-block" />
  ) : (
    <ArrowDown className="h-3 w-3 ml-1 inline-block" />
  );
}

/**
 * Main RecommendationsList Component
 */
export function RecommendationsList({
  recommendations,
  isLoading,
  onViewDetails,
  onSuppress,
  onDismiss,
  totalCount = 0,
  currentPage = 1,
  pageSize = 50,
  onPageChange,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
}: RecommendationsListProps) {
  /**
   * Handle column sort
   */
  const handleSort = (columnKey: 'lastUpdated' | 'impact' | 'category' | 'savings') => {
    if (!onSortChange) return;

    const newSortOrder =
      sortBy === columnKey && sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(columnKey, newSortOrder);
  };

  /**
   * Calculate pagination
   */
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  /**
   * Handle row click
   */
  const handleRowClick = (recommendation: AdvisorRecommendationDTO) => {
    onViewDetails(recommendation);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TableSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`${col.width} ${
                        col.sortable ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                      onClick={() => col.sortable && handleSort(col.key as 'lastUpdated' | 'impact' | 'category' | 'savings')}
                      role={col.sortable ? 'button' : undefined}
                      tabIndex={col.sortable ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                          handleSort(col.key as 'lastUpdated' | 'impact' | 'category' | 'savings');
                        }
                      }}
                    >
                      <div className="flex items-center">
                        {col.label}
                        {col.sortable && (
                          <SortIcon
                            column={col.key}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((recommendation) => (
                  <TableRow
                    key={recommendation.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(recommendation)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleRowClick(recommendation);
                      }
                    }}
                  >
                    {/* Category */}
                    <TableCell>
                      <CategoryBadge category={recommendation.category} size="sm" />
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 line-clamp-2">
                          {recommendation.shortDescription}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated {formatRelativeDate(recommendation.lastUpdated)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Resource */}
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 truncate">
                          {recommendation.resourceName || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {recommendation.resourceType}
                        </p>
                      </div>
                    </TableCell>

                    {/* Impact */}
                    <TableCell>
                      <ImpactBadge impact={recommendation.impact} size="sm" />
                    </TableCell>

                    {/* Potential Savings */}
                    <TableCell>
                      {recommendation.potentialSavings ? (
                        <span className="font-semibold text-green-600">
                          {formatCurrency(
                            recommendation.potentialSavings.amount,
                            recommendation.potentialSavings.currency
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={recommendation.status} size="sm" />
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(recommendation);
                          }}
                          aria-label="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {recommendation.status === 'Active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSuppress(recommendation);
                              }}
                              aria-label="Suppress recommendation"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDismiss(recommendation);
                              }}
                              aria-label="Dismiss recommendation"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex}</span> to{' '}
                <span className="font-semibold">{endIndex}</span> of{' '}
                <span className="font-semibold">{totalCount}</span> recommendations
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
