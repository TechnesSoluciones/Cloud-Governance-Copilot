/**
 * Resources Page
 * CloudNexus V2 Design - Resources Management
 *
 * NOTE: Layout is provided by DashboardLayoutWrapper (in layout.tsx)
 * This page only renders the content, not the layout structure
 */

'use client';

import { useState, useMemo } from 'react';
import { ResourceTable, ResourceFilters, ResourceDetailModal } from '@/components/resources';
import { Resource, ResourceFilters as IResourceFilters } from '@/types/resources';
import { useResources } from '@/hooks/useResources';

export default function ResourcesPage() {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [filters, setFilters] = useState<IResourceFilters>({});

  // Fetch resources from backend with filters
  const { data: resourcesData, isLoading, error, refetch } = useResources({
    page: 1,
    limit: 100,
    search: filters.search,
    resourceType: filters.resourceType,
    location: filters.location,
    resourceGroup: filters.resourceGroup,
  });

  // Extract resources from API response
  const resources = useMemo(() => {
    if (!resourcesData?.success || !resourcesData.data) return [];
    return resourcesData.data.data || [];
  }, [resourcesData]);

  // Loading state
  if (isLoading && resources.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading resources...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Resources
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {error instanceof Error ? error.message : 'Unable to fetch resources data'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter resources based on current filters (client-side filtering for advanced cases)
  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !filters.search ||
      resource.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      resource.type.toLowerCase().includes(filters.search.toLowerCase());

    const matchesType = !filters.resourceType || resource.type === filters.resourceType;

    const matchesLocation = !filters.location || resource.location === filters.location;

    const matchesResourceGroup =
      !filters.resourceGroup || resource.resourceGroup === filters.resourceGroup;

    return matchesSearch && matchesType && matchesLocation && matchesResourceGroup;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Cloud Resources
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage all your cloud resources across providers
          </p>
        </div>

        <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Resource
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <span className="material-symbols-outlined text-2xl text-blue-500">dns</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Resources
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {mockResources.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <span className="material-symbols-outlined text-2xl text-emerald-500">category</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Resource Types
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {new Set(mockResources.map((r) => r.type)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <span className="material-symbols-outlined text-2xl text-purple-500">location_on</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Locations</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {new Set(mockResources.map((r) => r.location)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <span className="material-symbols-outlined text-2xl text-orange-500">folder</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Resource Groups
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {new Set(mockResources.map((r) => r.resourceGroup)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ResourceFilters
        filters={filters}
        onFiltersChange={setFilters}
        resourceGroups={Array.from(new Set(mockResources.map((r) => r.resourceGroup)))}
      />

      {/* Resources Table */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800">
        <ResourceTable resources={filteredResources} onRowClick={setSelectedResource} isLoading={false} />
      </div>

      {/* Resource Detail Modal */}
      <ResourceDetailModal resource={selectedResource} onClose={() => setSelectedResource(null)} />
    </div>
  );
}
