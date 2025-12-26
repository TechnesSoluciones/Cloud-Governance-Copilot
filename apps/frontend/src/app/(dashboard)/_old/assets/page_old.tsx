'use client';

/**
 * Assets Page
 *
 * Main page for viewing and managing cloud asset inventory
 * Features:
 * - Asset inventory table with sorting and pagination
 * - Filters for provider, resource type, region, status
 * - Search by name/resource ID
 * - Manual asset discovery trigger
 * - Asset detail modal
 * - Real-time updates during discovery
 * - Empty states and error handling
 * - Loading states with skeletons
 * - Responsive design
 * - Accessibility compliant
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { RefreshCw, AlertCircle, Database } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  useAssets,
  useAssetDiscovery,
  extractAssetsData,
} from '@/hooks/useAssets';
import { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';
import { AssetInventoryTable } from '@/components/assets/AssetInventoryTable';
import { AssetFilters, AssetFiltersState } from '@/components/assets/AssetFilters';
import { AssetDetailModal } from '@/components/assets/AssetDetailModal';

const ITEMS_PER_PAGE = 20;
const POLLING_INTERVAL_DURING_DISCOVERY = 30000; // 30 seconds

export default function AssetsPage() {
  const { addToast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<AssetFiltersState>({
    status: 'active',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Discovery state
  const [isDiscoveryActive, setIsDiscoveryActive] = useState(false);

  // Fetch assets with filters
  const {
    data: assetsResponse,
    isLoading: isLoadingAssets,
    error: assetsError,
    refetch: refetchAssets,
  } = useAssets(
    {
      ...filters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortBy: 'lastSeenAt',
      sortOrder: 'desc',
    },
    {
      refetchInterval: isDiscoveryActive ? POLLING_INTERVAL_DURING_DISCOVERY : false,
    }
  );

  // Asset discovery mutation
  const {
    mutate: triggerDiscovery,
    isPending: isTriggering,
    isSuccess: discoverySuccess,
    isError: discoveryError,
    error: discoveryErrorData,
  } = useAssetDiscovery();

  // Extract data
  const assetsData = extractAssetsData(assetsResponse);
  const assets = assetsData?.data || [];
  const totalCount = assetsData?.meta.total || 0;
  const totalPages = assetsData?.meta.totalPages || 1;

  // Handle discovery trigger
  const handleTriggerDiscovery = () => {
    triggerDiscovery(
      {},
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            addToast(
              `Discovery started. Found ${data.data.discoveredCount} new assets and updated ${data.data.updatedCount} existing assets.`,
              'success'
            );
            setIsDiscoveryActive(true);
            refetchAssets();

            // Stop polling after 5 minutes
            setTimeout(() => {
              setIsDiscoveryActive(false);
            }, 5 * 60 * 1000);
          }
        },
        onError: (error) => {
          addToast('Failed to trigger asset discovery. Please try again.', 'error');
        },
      }
    );
  };

  // Handle asset click
  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  // Handle modal close
  const handleModalClose = () => {
    setSelectedAsset(null);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: AssetFiltersState) => {
    setFilters(newFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.provider, filters.resourceType, filters.region, filters.status, filters.search]);

  // Auto-stop discovery polling after success
  useEffect(() => {
    if (discoverySuccess) {
      // Keep polling for 2 minutes after discovery completes
      const timer = setTimeout(() => {
        setIsDiscoveryActive(false);
      }, 2 * 60 * 1000);

      return () => clearTimeout(timer);
    }
  }, [discoverySuccess]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Asset Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover and manage your cloud infrastructure assets across AWS and Azure
            </p>
          </div>
          <Button
            onClick={handleTriggerDiscovery}
            disabled={isTriggering || isDiscoveryActive}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white"
          >
            {isTriggering || isDiscoveryActive ? (
              <>
                <RefreshCw
                  className="h-4 w-4 mr-2 animate-spin"
                  aria-hidden="true"
                />
                {isTriggering ? 'Discovering...' : 'Discovery Active...'}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Discover Assets
              </>
            )}
          </Button>
        </div>

        {/* Discovery Active Banner */}
        {isDiscoveryActive && (
          <Card className="p-4 border-l-4 border-brand-orange bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-start gap-3">
              <RefreshCw
                className="h-5 w-5 text-brand-orange flex-shrink-0 animate-spin"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  Asset Discovery in Progress
                </h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  The system is discovering and updating your asset inventory. The table will
                  automatically refresh every 30 seconds.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <AssetFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {assets.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {totalCount}
            </span>{' '}
            assets
          </p>
        </div>

        {/* Error State */}
        {assetsError && (
          <Card className="p-6 border-l-4 border-error bg-error/5">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="h-6 w-6 text-error flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  Error Loading Assets
                </h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  There was an error loading your asset inventory. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetchAssets()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Assets Table */}
        <AssetInventoryTable
          assets={assets}
          isLoading={isLoadingAssets}
          onAssetClick={handleAssetClick}
          pagination={{
            page: currentPage,
            totalPages,
            onPageChange: handlePageChange,
          }}
        />

        {/* Empty State (when no filters and no assets) */}
        {!isLoadingAssets &&
          !assetsError &&
          assets.length === 0 &&
          !filters.provider &&
          !filters.resourceType &&
          !filters.region &&
          !filters.search && (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Database
                    className="h-12 w-12 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    No assets discovered yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    Start discovering your cloud infrastructure assets by clicking the
                    &quot;Discover Assets&quot; button above.
                  </p>
                </div>
                <Button
                  onClick={handleTriggerDiscovery}
                  disabled={isTriggering}
                  className="bg-brand-orange hover:bg-brand-orange-dark text-white mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Discover Assets
                </Button>
              </div>
            </Card>
          )}
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal asset={selectedAsset} onClose={handleModalClose} />
    </div>
  );
}
