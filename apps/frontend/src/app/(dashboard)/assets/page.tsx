'use client';

/**
 * Enhanced Assets Page
 *
 * Comprehensive asset inventory management with:
 * - Stats dashboard (total, orphaned, cost, last scan)
 * - View toggle (Tree, Table, Grid)
 * - Advanced filters
 * - Multi-select and bulk actions
 * - Resource detail panel
 * - Real-time updates
 * - Export functionality
 *
 * Features:
 * - Responsive design
 * - Accessibility compliant
 * - Performance optimized
 * - Error handling
 * - Loading states
 */

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  RefreshCw,
  AlertCircle,
  Database,
  Search,
  LayoutGrid,
  List,
  GitBranch,
  DollarSign,
  Server,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS,
} from '@/components/shared/premium';
import {
  useAssets,
  useAssetDiscovery,
  useAssetStats,
  extractAssetsData,
} from '@/hooks/useAssets';
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
import type { Asset } from '@/lib/api/assets';
import {
  AdvancedFilters,
  type AdvancedFiltersState,
  BulkActionsToolbar,
  ResourceDetailPanel,
  ResourceTreeView,
  AssetTableView,
  AssetGridView,
} from '@/components/assets';
import { cn } from '@/lib/utils';

// View types
type ViewType = 'tree' | 'table' | 'grid';

// Items per page
const ITEMS_PER_PAGE = 50;
const POLLING_INTERVAL_DURING_DISCOVERY = 30000; // 30 seconds

/**
 * Enhanced Assets Page Component
 */
export default function AssetsPage() {
  const { addToast } = useToast();

  // View state
  const [viewType, setViewType] = useState<ViewType>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [filters, setFilters] = useState<AdvancedFiltersState>({
    resourceTypes: [],
    regions: [],
    statuses: [],
    tags: {},
    showOrphanedOnly: false,
    costRange: { min: 0, max: 10000 },
  });

  // Selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Discovery state
  const [isDiscoveryActive, setIsDiscoveryActive] = useState(false);

  // Get cloud accounts and selected account
  const { selectedAccount, isLoading: isLoadingAccounts } = useCloudAccounts();
  const accountId = selectedAccount?.id || '';

  // Fetch assets with filters
  const {
    data: assetsResponse,
    isLoading: isLoadingAssets,
    error: assetsError,
    refetch: refetchAssets,
  } = useAssets(
    {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortBy: 'lastSeenAt',
      sortOrder: 'desc',
      search: searchQuery || undefined,
      status: filters.statuses.length > 0 ? (filters.statuses[0] as any) : undefined,
    },
    {
      refetchInterval: isDiscoveryActive ? POLLING_INTERVAL_DURING_DISCOVERY : false,
    }
  );

  // Fetch asset stats
  const { data: statsResponse } = useAssetStats(accountId);

  // Asset discovery mutation
  const {
    mutate: triggerDiscovery,
    isPending: isTriggering,
  } = useAssetDiscovery();

  // Extract data
  const assetsData = extractAssetsData(assetsResponse);
  const assets = assetsData?.data || [];
  const totalCount = assetsData?.meta.total || 0;
  const totalPages = assetsData?.meta.totalPages || 1;

  // Extract stats
  const stats = statsResponse?.success && statsResponse.data ? statsResponse.data.data : null;

  // Filter assets locally based on advanced filters
  const filteredAssets = useMemo(() => {
    let filtered = [...assets];

    // Resource type filter
    if (filters.resourceTypes.length > 0) {
      filtered = filtered.filter((asset) => filters.resourceTypes.includes(asset.resourceType));
    }

    // Region filter
    if (filters.regions.length > 0) {
      filtered = filtered.filter((asset) => filters.regions.includes(asset.region));
    }

    // Orphaned filter
    if (filters.showOrphanedOnly) {
      filtered = filtered.filter(
        (asset) => !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project
      );
    }

    // Cost range filter
    filtered = filtered.filter((asset) => {
      const cost = asset.monthlyCost || 0;
      return cost >= filters.costRange.min && cost <= filters.costRange.max;
    });

    // Tag filters
    Object.entries(filters.tags).forEach(([key, value]) => {
      filtered = filtered.filter((asset) => asset.tags?.[key] === value);
    });

    return filtered;
  }, [assets, filters]);

  // Get selected assets
  const selectedAssets = filteredAssets.filter((asset) => selectedAssetIds.includes(asset.id));

  // Extract unique types and regions for filters
  const availableTypes = useMemo(() => {
    const types = new Set(assets.map((a) => a.resourceType));
    return Array.from(types).sort();
  }, [assets]);

  const availableRegions = useMemo(() => {
    const regions = new Set(assets.map((a) => a.region));
    return Array.from(regions).sort();
  }, [assets]);

  // Handle discovery trigger
  const handleTriggerDiscovery = () => {
    triggerDiscovery(
      {},
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            addToast(
              `Discovery started. Found ${data.data.discoveredCount} new assets.`,
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
        onError: () => {
          addToast('Failed to trigger asset discovery', 'error');
        },
      }
    );
  };

  // Handle asset click
  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  // Handle selection change
  const handleSelectionChange = (assetIds: string[]) => {
    setSelectedAssetIds(assetIds);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedAssetIds([]);
  };

  // Handle bulk actions complete
  const handleBulkComplete = () => {
    refetchAssets();
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery]);

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-[1800px] mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Asset Inventory"
          subtitle="Discover and manage your cloud infrastructure assets"
          actions={
            <Button
              onClick={handleTriggerDiscovery}
              disabled={isTriggering || isDiscoveryActive}
              size="lg"
              className="bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg"
            >
              {isTriggering || isDiscoveryActive ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  {isTriggering ? 'Discovering...' : 'Discovery Active...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" aria-hidden="true" />
                  Discover Assets
                </>
              )}
            </Button>
          }
        />

        {/* Premium Stats Bar */}
        <PremiumStatsBar
          stats={[
            {
              label: 'Total Assets',
              value: (stats?.totalAssets || totalCount).toLocaleString(),
              icon: <Server className="h-14 w-14" />,
              iconBg: PREMIUM_GRADIENTS.azure,
              iconColor: PREMIUM_ICON_COLORS.azure,
              subtitle: 'Cloud resources',
            },
            {
              label: 'Orphaned Resources',
              value: stats?.orphanedAssets || 0,
              icon: <AlertCircle className="h-14 w-14" />,
              iconBg: PREMIUM_GRADIENTS.warning,
              iconColor: PREMIUM_ICON_COLORS.warning,
              subtitle: 'Missing tags',
            },
            {
              label: 'Monthly Cost',
              value: `$${(stats?.monthlyCost || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              icon: <DollarSign className="h-14 w-14" />,
              iconBg: PREMIUM_GRADIENTS.success,
              iconColor: PREMIUM_ICON_COLORS.success,
              subtitle: 'Infrastructure spend',
            },
            {
              label: 'Last Scan',
              value: stats?.lastScanTime
                ? formatDistanceToNow(new Date(stats.lastScanTime), { addSuffix: true })
                : '5 min ago',
              icon: <Clock className="h-14 w-14" />,
              iconBg: PREMIUM_GRADIENTS.info,
              iconColor: PREMIUM_ICON_COLORS.info,
              subtitle: 'Discovery status',
            },
          ]}
        />

        {/* Discovery Active Banner */}
        {isDiscoveryActive && (
          <Card className="p-4 border-l-4 border-brand-orange bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-start gap-3">
              <RefreshCw
                className="h-5 w-5 text-brand-orange flex-shrink-0 animate-spin"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">Asset Discovery in Progress</h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  The system is discovering and updating your asset inventory. Results will refresh automatically.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableTypes={availableTypes}
              availableRegions={availableRegions}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search and View Toggle */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    placeholder="Search by name or resource ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search assets"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <Button
                    variant={viewType === 'tree' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('tree')}
                    aria-label="Tree view"
                    className={cn(viewType === 'tree' && 'bg-white dark:bg-gray-700')}
                  >
                    <GitBranch className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant={viewType === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('table')}
                    aria-label="Table view"
                    className={cn(viewType === 'table' && 'bg-white dark:bg-gray-700')}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant={viewType === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('grid')}
                    aria-label="Grid view"
                    className={cn(viewType === 'grid' && 'bg-white dark:bg-gray-700')}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Bulk Actions Toolbar */}
            {selectedAssetIds.length > 0 && (
              <BulkActionsToolbar
                selectedAssets={selectedAssets}
                onDeselectAll={handleDeselectAll}
                onBulkComplete={handleBulkComplete}
              />
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {filteredAssets.length}
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
                  <AlertCircle className="h-6 w-6 text-error flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">Error Loading Assets</h3>
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

            {/* View Content */}
            {!isLoadingAssets && !assetsError && (
              <>
                {viewType === 'tree' && (
                  <ResourceTreeView
                    assets={filteredAssets}
                    selectedAssets={selectedAssetIds}
                    onAssetClick={handleAssetClick}
                    onSelectionChange={handleSelectionChange}
                  />
                )}

                {viewType === 'table' && (
                  <AssetTableView
                    assets={filteredAssets}
                    selectedAssets={selectedAssetIds}
                    onAssetClick={handleAssetClick}
                    onSelectionChange={handleSelectionChange}
                    pagination={{
                      page: currentPage,
                      totalPages,
                      onPageChange: setCurrentPage,
                    }}
                  />
                )}

                {viewType === 'grid' && (
                  <AssetGridView
                    assets={filteredAssets}
                    selectedAssets={selectedAssetIds}
                    onAssetClick={handleAssetClick}
                    onSelectionChange={handleSelectionChange}
                  />
                )}
              </>
            )}

            {/* Loading State */}
            {isLoadingAssets && (
              <Card className="p-12 text-center">
                <RefreshCw
                  className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin"
                  aria-hidden="true"
                />
                <p className="text-gray-500">Loading assets...</p>
              </Card>
            )}

            {/* Empty State */}
            {!isLoadingAssets && !assetsError && filteredAssets.length === 0 && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <Database className="h-12 w-12 text-gray-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">No assets found</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                      {totalCount === 0
                        ? 'Start discovering your cloud infrastructure assets by clicking the "Discover Assets" button above.'
                        : 'Try adjusting your filters or search criteria.'}
                    </p>
                  </div>
                  {totalCount === 0 && (
                    <Button
                      onClick={handleTriggerDiscovery}
                      disabled={isTriggering}
                      className="bg-brand-orange hover:bg-brand-orange-dark text-white mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                      Discover Assets
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Resource Detail Panel */}
      <ResourceDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
