/**
 * Inventory V2 Page
 * CloudNexus Design - Complete Resource Inventory Implementation
 */

'use client';

import { useState } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { FilterToolbar, FilterGroup } from '@/components/ui/FilterToolbar';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { cn } from '@/lib/utils';

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

const mockResources: Resource[] = [
  {
    id: '1',
    name: 'prod-web-server-01',
    type: 'EC2 Instance',
    provider: 'AWS',
    region: 'us-east-1',
    status: 'running',
    environment: 'production',
    cost: '$145/mo',
    tags: { app: 'web', team: 'platform' },
    lastUpdated: '2 hours ago',
  },
  {
    id: '2',
    name: 'prod-db-primary',
    type: 'RDS MySQL',
    provider: 'AWS',
    region: 'us-west-2',
    status: 'running',
    environment: 'production',
    cost: '$892/mo',
    tags: { app: 'database', team: 'backend' },
    lastUpdated: '1 hour ago',
  },
  {
    id: '3',
    name: 'staging-app-service',
    type: 'App Service',
    provider: 'Azure',
    region: 'westeurope',
    status: 'running',
    environment: 'staging',
    cost: '$78/mo',
    tags: { app: 'api', team: 'backend' },
    lastUpdated: '3 hours ago',
  },
  {
    id: '4',
    name: 'dev-storage-bucket',
    type: 'S3 Bucket',
    provider: 'AWS',
    region: 'us-east-1',
    status: 'warning',
    environment: 'development',
    cost: '$12/mo',
    tags: { app: 'storage', team: 'platform' },
    lastUpdated: '5 hours ago',
  },
  {
    id: '5',
    name: 'prod-gke-cluster',
    type: 'GKE Cluster',
    provider: 'GCP',
    region: 'us-central1',
    status: 'running',
    environment: 'production',
    cost: '$580/mo',
    tags: { app: 'kubernetes', team: 'platform' },
    lastUpdated: '30 minutes ago',
  },
  {
    id: '6',
    name: 'prod-load-balancer',
    type: 'Application Load Balancer',
    provider: 'AWS',
    region: 'us-east-1',
    status: 'running',
    environment: 'production',
    cost: '$45/mo',
    tags: { app: 'networking', team: 'platform' },
    lastUpdated: '1 hour ago',
  },
  {
    id: '7',
    name: 'staging-vm-worker',
    type: 'Virtual Machine',
    provider: 'Azure',
    region: 'eastus',
    status: 'stopped',
    environment: 'staging',
    cost: '$0/mo',
    tags: { app: 'worker', team: 'backend' },
    lastUpdated: '2 days ago',
  },
  {
    id: '8',
    name: 'prod-cdn-distribution',
    type: 'CloudFront',
    provider: 'AWS',
    region: 'global',
    status: 'running',
    environment: 'production',
    cost: '$124/mo',
    tags: { app: 'cdn', team: 'platform' },
    lastUpdated: '4 hours ago',
  },
];

const filterGroups: FilterGroup[] = [
  {
    id: 'provider',
    label: 'Provider',
    icon: 'cloud',
    multiSelect: true,
    options: [
      { id: 'aws', label: 'AWS', value: 'AWS', count: 5 },
      { id: 'azure', label: 'Azure', value: 'Azure', count: 2 },
      { id: 'gcp', label: 'GCP', value: 'GCP', count: 1 },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    icon: 'toggle_on',
    multiSelect: true,
    options: [
      { id: 'running', label: 'Running', value: 'running', count: 6 },
      { id: 'stopped', label: 'Stopped', value: 'stopped', count: 1 },
      { id: 'warning', label: 'Warning', value: 'warning', count: 1 },
    ],
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: 'deployed_code',
    multiSelect: true,
    options: [
      { id: 'production', label: 'Production', value: 'production', count: 5 },
      { id: 'staging', label: 'Staging', value: 'staging', count: 2 },
      { id: 'development', label: 'Development', value: 'development', count: 1 },
    ],
  },
  {
    id: 'type',
    label: 'Resource Type',
    icon: 'category',
    multiSelect: true,
    options: [
      { id: 'compute', label: 'Compute', value: 'compute', count: 4 },
      { id: 'storage', label: 'Storage', value: 'storage', count: 1 },
      { id: 'database', label: 'Database', value: 'database', count: 1 },
      { id: 'networking', label: 'Networking', value: 'networking', count: 2 },
    ],
  },
];

const resourceTypeDistribution = [
  { type: 'Compute', count: 342, percentage: 45 },
  { type: 'Storage', count: 228, percentage: 30 },
  { type: 'Database', count: 114, percentage: 15 },
  { type: 'Networking', count: 76, percentage: 10 },
];

export default function InventoryV2Page() {
  const [filteredResources, setFilteredResources] = useState<Resource[]>(mockResources);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    // Simple filter implementation for demo
    let filtered = mockResources;

    // Note: In production, you'd track all active filters and apply them together
    if (selectedValues.length > 0) {
      if (filterId === 'provider') {
        filtered = filtered.filter((r) => selectedValues.includes(r.provider));
      } else if (filterId === 'status') {
        filtered = filtered.filter((r) => selectedValues.includes(r.status));
      } else if (filterId === 'environment') {
        filtered = filtered.filter((r) => selectedValues.includes(r.environment));
      }
    }

    setFilteredResources(filtered);
  };

  const totalResources = mockResources.length;
  const runningResources = mockResources.filter((r) => r.status === 'running').length;
  const totalCost = mockResources.reduce((sum, r) => {
    const cost = parseInt(r.cost.replace(/[^0-9]/g, '')) || 0;
    return sum + cost;
  }, 0);

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
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">refresh</span>
                Sync Now
              </button>
              <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
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
              value={totalResources.toString()}
              variant="blue"
              comparison="Across all providers"
            />
            <KPICardV2
              icon="check_circle"
              label="Running Resources"
              value={runningResources.toString()}
              variant="emerald"
              comparison={`${Math.round((runningResources / totalResources) * 100)}% of total`}
            />
            <KPICardV2
              icon="attach_money"
              label="Total Cost"
              value={`$${totalCost.toLocaleString()}`}
              variant="orange"
              comparison="Monthly estimate"
            />
            <KPICardV2
              icon="cloud"
              label="Providers"
              value="3"
              variant="indigo"
              comparison="AWS, Azure, GCP"
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
                    className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                </div>
              </div>
            </div>

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
                <button className="w-full px-4 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">settings</span>
                  Manage Resource
                </button>
                <button className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">monitoring</span>
                  View Metrics
                </button>
                <button className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">local_offer</span>
                  Edit Tags
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
