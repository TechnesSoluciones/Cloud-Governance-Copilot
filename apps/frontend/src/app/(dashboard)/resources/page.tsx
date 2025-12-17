'use client';

/**
 * Azure Resources Inventory Page
 *
 * Main page for browsing and managing Azure resources
 *
 * Features:
 * - Advanced filtering by resource type, location, and resource group
 * - Debounced search across name, type, and location (300ms)
 * - Sortable table columns
 * - Row selection for bulk actions
 * - Pagination with page controls
 * - Export to CSV functionality
 * - Manual refresh button
 * - Resource detail modal
 * - Loading states with skeletons
 * - Error handling with retry
 * - Empty states
 * - Responsive design
 * - Full accessibility support
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';
import {
  RefreshCw,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Server,
  Package,
  MapPin,
} from 'lucide-react';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PremiumFilterBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_BACKGROUNDS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS
} from '@/components/shared/premium';
import {
  useResources,
  extractResourcesData,
  extractPaginationData,
  getUniqueResourceGroups,
} from '@/hooks/useResources';
import {
  ResourceTable,
  ResourceFilters,
  ResourceDetailModal,
} from '@/components/resources';
import { Resource, ResourceFilters as IResourceFilters } from '@/types/resources';
import { exportResourcesToCSV } from '@/utils/exportCSV';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TableSkeletonWithFilters } from '@/components/skeletons';

// Constants
const ITEMS_PER_PAGE = 20;

/**
 * Pagination Controls Component
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  total,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  // Calculate visible page range
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Page <span className="font-semibold">{currentPage}</span> of{' '}
          <span className="font-semibold">{totalPages}</span>{' '}
          <span className="hidden sm:inline">
            ({total} total resource{total !== 1 ? 's' : ''})
          </span>
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>

          {/* Page Numbers */}
          <div className="hidden md:flex items-center gap-1">
            {pageNumbers.map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={
                  currentPage === pageNum
                    ? 'bg-brand-orange hover:bg-brand-orange-dark'
                    : ''
                }
              >
                {pageNum}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * Main Resources Page Component (wrapped in ErrorBoundary)
 */
function ResourcesPageContent() {
  const { addToast } = useToast();

  // State
  const [filters, setFilters] = useState<IResourceFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'location' | 'resourceGroup'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch resources
  const {
    data: resourcesResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useResources({
    ...filters,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    sortBy,
    sortOrder,
  });

  // Extract data
  const resources = extractResourcesData(resourcesResponse);
  const pagination = extractPaginationData(resourcesResponse);
  const resourceGroups = resources.length > 0 ? getUniqueResourceGroups(resources) : [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.resourceType, filters.location, filters.resourceGroup, filters.search]);

  /**
   * Handle filter changes
   */
  const handleFiltersChange = (newFilters: IResourceFilters) => {
    setFilters(newFilters);
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (column: 'name' | 'type' | 'location' | 'resourceGroup') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  /**
   * Handle row click
   */
  const handleRowClick = (resource: Resource) => {
    setSelectedResource(resource);
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setSelectedResource(null);
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refetch();
    addToast('Resources refreshed successfully', 'success');
  };

  /**
   * Handle export to CSV
   */
  const handleExport = () => {
    if (resources.length === 0) {
      addToast('No resources to export', 'error');
      return;
    }

    try {
      exportResourcesToCSV(resources);
      addToast(
        `Exported ${resources.length} resource${resources.length !== 1 ? 's' : ''} to CSV`,
        'success'
      );
    } catch (err) {
      logger.error('Export error:', err);
      addToast('Failed to export resources', 'error');
    }
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    refetch();
  };

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Azure Resources"
          subtitle="Browse and manage your Azure resource inventory"
          actions={
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleRefresh}
                disabled={isFetching}
                className="shadow-lg"
                aria-label="Refresh resources"
              >
                <RefreshCw
                  className={`h-5 w-5 mr-2 ${isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={handleExport}
                disabled={resources.length === 0}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg"
                aria-label="Export to CSV"
              >
                <Download className="h-5 w-5 mr-2" aria-hidden="true" />
                Export CSV
              </Button>
            </>
          }
        />

        {/* Premium Stats Bar */}
        {!isLoading && !error && (
          <PremiumStatsBar
            stats={[
              {
                label: 'Total Resources',
                value: pagination.total.toLocaleString(),
                icon: <Server className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: `${resources.length} visible on this page`,
              },
              {
                label: 'Resource Types',
                value: new Set(resources.map(r => r.type)).size,
                icon: <Package className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.info,
                iconColor: PREMIUM_ICON_COLORS.info,
                subtitle: 'Unique types in current view',
              },
              {
                label: 'Locations',
                value: new Set(resources.map(r => r.location)).size,
                icon: <MapPin className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.success,
                iconColor: PREMIUM_ICON_COLORS.success,
                subtitle: 'Azure regions',
              },
            ]}
          />
        )}

        {/* Filters */}
        <ResourceFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          resourceGroups={resourceGroups}
        />

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {resources.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {pagination.total}
            </span>{' '}
            resources
          </p>

          {selectedIds.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-brand-orange">
                {selectedIds.length}
              </span>{' '}
              selected
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Error Loading Resources
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  There was an error loading your Azure resources. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Resources Table */}
        <ResourceTable
          resources={resources}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Pagination */}
        {!isLoading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Resource Detail Modal */}
      <ResourceDetailModal
        resource={selectedResource}
        onClose={handleModalClose}
      />
    </div>
  );
}

/**
 * Exported page component wrapped in ErrorBoundary
 */
export default function ResourcesPage() {
  return (
    <ErrorBoundary>
      <ResourcesPageContent />
    </ErrorBoundary>
  );
}
