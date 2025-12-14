'use client';

import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown, Database } from 'lucide-react';
import { CostByServiceTableProps, SortableColumn, SortDirection } from './types';
import {
  formatCurrency,
  formatPercentage,
  getProviderBadgeClasses,
} from './utils';

/**
 * Items per page for pagination
 */
const ITEMS_PER_PAGE = 10;

/**
 * CostByServiceTable Component
 *
 * Displays a sortable, paginated table of costs broken down by service.
 * Features:
 * - Sortable columns (service, provider, cost, percentage)
 * - Pagination (10 items per page)
 * - Provider badges with color coding
 * - Percentage bar visualization
 * - Responsive design (mobile-friendly)
 * - Loading and empty states
 * - Design system compliant styling
 *
 * @example
 * ```tsx
 * <CostByServiceTable
 *   data={[
 *     { service: 'EC2', provider: 'AWS', totalCost: 1234.56, currency: 'USD', percentage: 45.2 },
 *     { service: 'S3', provider: 'AWS', totalCost: 567.89, currency: 'USD', percentage: 20.8 },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export const CostByServiceTable: React.FC<CostByServiceTableProps> = ({
  data,
  isLoading = false,
}) => {
  const [sortColumn, setSortColumn] = React.useState<SortableColumn>('totalCost');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  /**
   * Handle column sort
   */
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - default to descending for cost/percentage, ascending for text
      setSortColumn(column);
      setSortDirection(
        column === 'totalCost' || column === 'percentage' ? 'desc' : 'asc'
      );
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  /**
   * Sort data based on current sort settings
   */
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // String comparison for text columns
      if (sortColumn === 'service' || sortColumn === 'provider') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  /**
   * Paginate sorted data
   */
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage]);

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  /**
   * Render sort icon for column headers
   */
  const SortIcon = ({ column }: { column: SortableColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-neutral-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    );
  };

  /**
   * Percentage bar visualization
   */
  const PercentageBar = ({ value }: { value: number }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(value, 100)}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-sm font-medium text-neutral-700 min-w-[3rem] text-right">
        {formatPercentage(value)}
      </span>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <div className="h-6 w-48 bg-neutral-200 rounded animate-pulse" />
        </div>
        <TableSkeleton rows={10} columns={4} />
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <EmptyState
          icon={<Database className="h-12 w-12" />}
          title="No service cost data available"
          description="Service-level cost breakdowns will appear here once your cloud accounts are connected and costs are collected."
        />
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6"
      role="region"
      aria-label="Cost by service table"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900">Cost by Service</h3>
        <p className="text-sm text-neutral-600 mt-1">
          Breakdown of costs by cloud service ({sortedData.length} services)
        </p>
      </div>

      {/* Table */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="font-semibold text-neutral-700">
                  <button
                    className="flex items-center hover:text-neutral-900 transition-colors"
                    onClick={() => handleSort('service')}
                    aria-label="Sort by service"
                  >
                    Service
                    <SortIcon column="service" />
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-neutral-700">
                  <button
                    className="flex items-center hover:text-neutral-900 transition-colors"
                    onClick={() => handleSort('provider')}
                    aria-label="Sort by provider"
                  >
                    Provider
                    <SortIcon column="provider" />
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-neutral-700">
                  <button
                    className="flex items-center hover:text-neutral-900 transition-colors"
                    onClick={() => handleSort('totalCost')}
                    aria-label="Sort by cost"
                  >
                    Cost
                    <SortIcon column="totalCost" />
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-neutral-700">
                  <button
                    className="flex items-center hover:text-neutral-900 transition-colors"
                    onClick={() => handleSort('percentage')}
                    aria-label="Sort by percentage"
                  >
                    Percentage
                    <SortIcon column="percentage" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow
                  key={`${item.provider}-${item.service}-${index}`}
                  className="hover:bg-neutral-50 border-b border-neutral-100 transition-colors"
                >
                  <TableCell className="font-medium text-neutral-900">
                    {item.service}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`px-2 py-1 text-xs font-medium ${getProviderBadgeClasses(
                        item.provider
                      )}`}
                    >
                      {item.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-neutral-900">
                    {formatCurrency(item.totalCost, item.currency)}
                  </TableCell>
                  <TableCell>
                    <PercentageBar value={item.percentage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} of{' '}
            {sortedData.length} services
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

CostByServiceTable.displayName = 'CostByServiceTable';
