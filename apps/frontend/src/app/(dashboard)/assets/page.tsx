/**
 * Inventory V2 Page
 * CloudNexus Design - Complete Resource Inventory Implementation
 */

'use client';

import { useState, useEffect } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { FilterToolbar, FilterGroup } from '@/components/ui/FilterToolbar';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { cn } from '@/lib/utils';
import {
  useAssets,
  useTriggerDiscovery,
  useUpdateTags,
  extractAssetsData,
} from '@/hooks/useAssets';
import { Asset as ApiAsset } from '@/lib/api/assets';

interface Resource {
  id: string;
  name: string;
  type: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  region: string;
  status: 'running' | 'stopped' | 'warning' | 'error';
  environment: 'production' | 'staging' | 'development';
  cost: string;
  tags: Record<string, string>;
  lastUpdated: string;
}

// Helper function to transform API asset to component format
function transformAsset(apiAsset: ApiAsset): Resource {
  const formatProvider = (provider: string): 'AWS' | 'Azure' | 'GCP' => {
    if (provider === 'AZURE') return 'Azure';
    if (provider === 'AWS') return 'AWS';
    return 'GCP';
  };

  const formatStatus = (status: string): 'running' | 'stopped' | 'warning' | 'error' => {
    if (status === 'active') return 'running';
    if (status === 'terminated') return 'stopped';
    return 'warning';
  };

  const getEnvironment = (tags: Record<string, string>): 'production' | 'staging' | 'development' => {
    const env = tags.environment || tags.Environment || tags.env;
    if (env === 'prod' || env === 'production') return 'production';
    if (env === 'staging' || env === 'stg') return 'staging';
    return 'development';
  };

  const formatLastUpdated = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return {
    id: apiAsset.id,
    name: apiAsset.name,
    type: apiAsset.resourceType,
    provider: formatProvider(apiAsset.provider),
    region: apiAsset.region,
    status: formatStatus(apiAsset.status),
    environment: getEnvironment(apiAsset.tags),
    cost: apiAsset.monthlyCost ? `$${apiAsset.monthlyCost}/mo` : '$0/mo',
    tags: apiAsset.tags,
    lastUpdated: formatLastUpdated(apiAsset.lastSeenAt),
  };
}

const filterGroups: FilterGroup[] = [
  {
    id: 'provider',
    label: 'Provider',
    icon: 'cloud',
    multiSelect: true,
    options: [
      { id: 'aws', label: 'AWS', value: 'AWS', count: 0 },
      { id: 'azure', label: 'Azure', value: 'Azure', count: 0 },
      { id: 'gcp', label: 'GCP', value: 'GCP', count: 0 },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    icon: 'toggle_on',
    multiSelect: true,
    options: [
      { id: 'active', label: 'Running', value: 'active', count: 0 },
      { id: 'terminated', label: 'Stopped', value: 'terminated', count: 0 },
    ],
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: 'deployed_code',
    multiSelect: true,
    options: [
      { id: 'production', label: 'Production', value: 'production', count: 0 },
      { id: 'staging', label: 'Staging', value: 'staging', count: 0 },
      { id: 'development', label: 'Development', value: 'development', count: 0 },
    ],
  },
];

export default function InventoryV2Page() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch assets from API
  const { data: assetsData, refetch: refetchAssets, isLoading: isLoadingAssets } = useAssets({});

  // Mutations
  const { mutate: triggerDiscovery, isPending: isDiscovering } = useTriggerDiscovery();
  const { mutate: updateTags, isPending: isUpdatingTags } = useUpdateTags();

  // Transform and set assets when data changes
  useEffect(() => {
    const data = extractAssetsData(assetsData);
    if (data?.data) {
      const transformed = data.data.map(transformAsset);
      setResources(transformed);
      setFilteredResources(transformed);
    }
    setIsLoading(isLoadingAssets);
  }, [assetsData, isLoadingAssets]);

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    let filtered = resources;

    if (selectedValues.length > 0) {
      if (filterId === 'provider') {
        filtered = filtered.filter((r) => selectedValues.includes(r.provider));
      } else if (filterId === 'status') {
        filtered = filtered.filter((r) =>
          selectedValues.includes(r.status === 'running' ? 'active' : 'terminated')
        );
      } else if (filterId === 'environment') {
        filtered = filtered.filter((r) => selectedValues.includes(r.environment));
      }
    }

    // Apply search filter if exists
    if (searchQuery) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    let filtered = resources;

    if (query) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.type.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  };

  const handleSyncNow = () => {
    triggerDiscovery(
      {},
      {
        onSuccess: (response) => {
          if (response.success) {
            alert(`Discovery complete! Found ${response.data?.discoveredCount} new assets`);
            refetchAssets();
          }
        },
        onError: (error) => {
          alert(`Failed to trigger discovery: ${error.message}`);
        },
      }
    );
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(resources, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEditTags = (resourceId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;

    const tagsJson = prompt('Enter tags as JSON (e.g., {"team": "backend", "env": "prod"}):');
    if (!tagsJson) return;

    try {
      const tags = JSON.parse(tagsJson);
      updateTags(
        { id: resourceId, params: { tags } },
        {
          onSuccess: () => {
            alert('Tags updated successfully');
            refetchAssets();
            setSelectedResource(null);
          },
          onError: (error) => {
            alert(`Failed to update tags: ${error.message}`);
          },
        }
      );
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const totalResources = resources.length;
  const runningResources = resources.filter((r) => r.status === 'running').length;
  const totalCost = resources.reduce((sum, r) => {
    const cost = parseInt(r.cost.replace(/[^0-9]/g, '')) || 0;
    return sum + cost;
  }, 0);

  // Calculate resource type distribution from real data
  const resourceTypeDistribution = Object.entries(
    resources.reduce((acc, r) => {
      const category = r.type.includes('Instance') || r.type.includes('VM') || r.type.includes('Cluster') ? 'Compute'
        : r.type.includes('Bucket') || r.type.includes('Storage') ? 'Storage'
        : r.type.includes('Database') || r.type.includes('RDS') || r.type.includes('SQL') ? 'Database'
        : 'Networking';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    type,
    count,
    percentage: totalResources > 0 ? Math.round((count / totalResources) * 100) : 0,
  }));

  return (
    <div className="h-full flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Resource Inventory
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Comprehensive view of all cloud resources
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncNow}
                disabled={isDiscovering || isLoading}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                {isDiscovering ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleExport}
                disabled={resources.length === 0}
                className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Export Inventory
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICardV2
              icon="dns"
              label="Total Resources"
              value={isLoading ? '...' : totalResources.toString()}
              variant="blue"
              comparison="Across all providers"
            />
            <KPICardV2
              icon="check_circle"
              label="Running Resources"
              value={isLoading ? '...' : runningResources.toString()}
              variant="emerald"
              comparison={isLoading ? '...' : `${totalResources > 0 ? Math.round((runningResources / totalResources) * 100) : 0}% of total`}
            />
            <KPICardV2
              icon="attach_money"
              label="Total Cost"
              value={isLoading ? '...' : `$${totalCost.toLocaleString()}`}
              variant="orange"
              comparison="Monthly estimate"
            />
            <KPICardV2
              icon="cloud"
              label="Providers"
              value={isLoading ? '...' : new Set(resources.map(r => r.provider)).size.toString()}
              variant="indigo"
              comparison={isLoading ? '...' : Array.from(new Set(resources.map(r => r.provider))).join(', ')}
            />
          </div>

          {/* Resource Type Distribution */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Resource Type Distribution
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Breakdown by resource category
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {resourceTypeDistribution.map((item) => (
                <div
                  key={item.type}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.type}
                    </h4>
                    <span className="text-2xl font-bold text-brand-primary-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-brand-primary-400 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {item.percentage}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="mb-6">
            <FilterToolbar filters={filterGroups} onFilterChange={handleFilterChange} />
          </div>

          {/* Resources Table */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  All Resources
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {filteredResources.length} resources found
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-400"></div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading resources...</p>
                </div>
              </div>
            )}

            {!isLoading && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Resource Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Environment
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map((resource) => (
                    <tr
                      key={resource.id}
                      onClick={() => setSelectedResource(resource)}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <BadgeV2
                            variant={
                              resource.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'
                            }
                            size="sm"
                          >
                            {resource.provider}
                          </BadgeV2>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {resource.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {resource.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {resource.region}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicatorV2
                          status={
                            resource.status === 'running'
                              ? 'operational'
                              : resource.status === 'warning'
                                ? 'warning'
                                : resource.status === 'error'
                                  ? 'critical'
                                  : 'degraded'
                          }
                          label={resource.status}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <BadgeV2
                          variant={
                            resource.environment === 'production'
                              ? 'error'
                              : resource.environment === 'staging'
                                ? 'warning'
                                : 'info'
                          }
                          size="sm"
                        >
                          {resource.environment}
                        </BadgeV2>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {resource.cost}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {resource.lastUpdated}
                        </span>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        {selectedResource && (
          <div className="w-96 bg-white dark:bg-card-dark border-l border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Close Button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Resource Details
                </h2>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>

              {/* Provider Badge */}
              <div className="flex items-center gap-2 mb-4">
                <BadgeV2
                  variant={selectedResource.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                >
                  {selectedResource.provider}
                </BadgeV2>
                <BadgeV2
                  variant={
                    selectedResource.environment === 'production'
                      ? 'error'
                      : selectedResource.environment === 'staging'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {selectedResource.environment}
                </BadgeV2>
              </div>

              {/* Resource Name */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {selectedResource.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {selectedResource.type}
              </p>

              {/* Status */}
              <div className="mb-6">
                <StatusIndicatorV2
                  status={
                    selectedResource.status === 'running'
                      ? 'operational'
                      : selectedResource.status === 'warning'
                        ? 'warning'
                        : selectedResource.status === 'error'
                          ? 'critical'
                          : 'degraded'
                  }
                  label={selectedResource.status.toUpperCase()}
                  details={`Last updated ${selectedResource.lastUpdated}`}
                  icon="toggle_on"
                />
              </div>

              {/* Details Grid */}
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Region
                  </h4>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedResource.region}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Monthly Cost
                  </h4>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedResource.cost}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Resource ID
                  </h4>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 block overflow-x-auto custom-scrollbar">
                    {selectedResource.id}
                  </code>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Tags
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedResource.tags).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2"
                    >
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {key}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => alert('Manage Resource functionality coming soon')}
                  className="w-full px-4 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">settings</span>
                  Manage Resource
                </button>
                <button
                  onClick={() => alert('View Metrics functionality coming soon')}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">monitoring</span>
                  View Metrics
                </button>
                <button
                  onClick={() => handleEditTags(selectedResource.id)}
                  disabled={isUpdatingTags}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">local_offer</span>
                  {isUpdatingTags ? 'Updating...' : 'Edit Tags'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
