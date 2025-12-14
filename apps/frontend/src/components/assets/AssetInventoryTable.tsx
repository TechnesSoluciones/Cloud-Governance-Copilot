'use client';

/**
 * Asset Inventory Table Component
 *
 * Displays asset inventory in a sortable, interactive table format
 * Features:
 * - Sortable columns
 * - Row click for details
 * - Status and provider badges
 * - Cost formatting
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
  Database,
  ChevronLeft,
  ChevronRight,
  Server,
  AlertCircle,
} from 'lucide-react';
import { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Provider Badge Component
interface ProviderBadgeProps {
  provider: AssetProvider;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider }) => {
  const variants: Record<AssetProvider, { variant: 'default' | 'info'; className: string }> = {
    AWS: {
      variant: 'default',
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    AZURE: {
      variant: 'info',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
  };

  const config = variants[provider];

  return (
    <Badge variant={config.variant} className={config.className}>
      {provider}
    </Badge>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: AssetStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<AssetStatus, { variant: 'success' | 'secondary'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    terminated: { variant: 'secondary', label: 'Terminated' },
  };

  const config = variants[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Empty State Component
const EmptyState: React.FC = () => (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-gray-100 rounded-full">
        <Database className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">No assets found</h3>
        <p className="mt-2 text-sm text-gray-600 max-w-md">
          Trigger asset discovery to populate your inventory or adjust your filters to see more
          results.
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
        <p className="text-sm text-gray-600">
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
export interface AssetInventoryTableProps {
  assets: Asset[];
  isLoading: boolean;
  onAssetClick: (asset: Asset) => void;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * Asset Inventory Table
 * Displays assets with sorting, filtering, and pagination
 */
export const AssetInventoryTable: React.FC<AssetInventoryTableProps> = ({
  assets,
  isLoading,
  onAssetClick,
  pagination,
}) => {
  // Loading State
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Empty State
  if (assets.length === 0) {
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
                <TableHead className="w-[25%]">Name</TableHead>
                <TableHead className="w-[15%]">Type</TableHead>
                <TableHead className="w-[10%]">Provider</TableHead>
                <TableHead className="w-[12%]">Region</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[13%] text-right">Monthly Cost</TableHead>
                <TableHead className="w-[15%]">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow
                  key={asset.id}
                  onClick={() => onAssetClick(asset)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onAssetClick(asset);
                    }
                  }}
                  aria-label={`View details for ${asset.name}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Server
                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate max-w-[250px]" title={asset.name}>
                        {asset.name || asset.resourceId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {asset.resourceType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProviderBadge provider={asset.provider} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {asset.region}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={asset.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.monthlyCost !== undefined && asset.monthlyCost !== null ? (
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        ${asset.monthlyCost.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })}
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
