'use client';

/**
 * Resource Filters Component
 *
 * Provides comprehensive filtering controls for Azure resource inventory
 * Features:
 * - Resource type dropdown filter
 * - Location/region dropdown filter
 * - Resource group dropdown filter
 * - Debounced search box (300ms delay)
 * - Clear all filters button
 * - Active filters displayed as removable tags
 * - Responsive grid layout
 * - Accessibility features (ARIA labels, keyboard navigation)
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import {
  ResourceFilters as IResourceFilters,
  COMMON_RESOURCE_TYPES,
  COMMON_LOCATIONS,
} from '@/types/resources';

/**
 * Component Props
 */
export interface ResourceFiltersProps {
  /** Current filter values */
  filters: IResourceFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: IResourceFilters) => void;
  /** Optional list of unique resource groups from current data */
  resourceGroups?: string[];
}

/**
 * Resource Filters Component
 *
 * Interactive filter controls for resource inventory
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<ResourceFilters>({});
 *
 * <ResourceFilters
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   resourceGroups={['rg-prod', 'rg-dev']}
 * />
 * ```
 */
export const ResourceFilters: React.FC<ResourceFiltersProps> = ({
  filters,
  onFiltersChange,
  resourceGroups = [],
}) => {
  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({
          ...filters,
          search: searchInput || undefined,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync local search state with external filter changes
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search || '');
    }
  }, [filters.search]);

  /**
   * Handle resource type filter change
   */
  const handleResourceTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      resourceType: value === 'all' ? undefined : value,
    });
  };

  /**
   * Handle location filter change
   */
  const handleLocationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      location: value === 'all' ? undefined : value,
    });
  };

  /**
   * Handle resource group filter change
   */
  const handleResourceGroupChange = (value: string) => {
    onFiltersChange({
      ...filters,
      resourceGroup: value === 'all' ? undefined : value,
    });
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setSearchInput('');
    onFiltersChange({});
  };

  /**
   * Remove a specific filter
   */
  const removeFilter = (filterKey: keyof IResourceFilters) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey];

    if (filterKey === 'search') {
      setSearchInput('');
    }

    onFiltersChange(newFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof IResourceFilters] !== undefined
  );

  // Count active filters (excluding search)
  const activeFilterCount = Object.keys(filters).filter(
    (key) => key !== 'search' && filters[key as keyof IResourceFilters] !== undefined
  ).length;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-xs bg-brand-orange text-white"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search resources by name, type, or location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-8"
              aria-label="Search resources"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  removeFilter('search');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Resource Type Filter */}
          <Select
            value={filters.resourceType || 'all'}
            onValueChange={handleResourceTypeChange}
          >
            <SelectTrigger aria-label="Filter by resource type">
              <SelectValue placeholder="All Resource Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resource Types</SelectItem>
              {COMMON_RESOURCE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select
            value={filters.location || 'all'}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger aria-label="Filter by location">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {COMMON_LOCATIONS.map((location) => (
                <SelectItem key={location.value} value={location.value}>
                  {location.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Second Row: Resource Group */}
        {resourceGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={filters.resourceGroup || 'all'}
              onValueChange={handleResourceGroupChange}
            >
              <SelectTrigger aria-label="Filter by resource group">
                <SelectValue placeholder="All Resource Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resource Groups</SelectItem>
                {resourceGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active Filters Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
              Active:
            </span>
            {filters.resourceType && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
                onClick={() => removeFilter('resourceType')}
              >
                Type: {COMMON_RESOURCE_TYPES.find(t => t.value === filters.resourceType)?.label || filters.resourceType}
                <X className="h-3 w-3 ml-1" aria-hidden="true" />
              </Badge>
            )}
            {filters.location && (
              <Badge
                variant="secondary"
                className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800"
                onClick={() => removeFilter('location')}
              >
                Location: {COMMON_LOCATIONS.find(l => l.value === filters.location)?.label || filters.location}
                <X className="h-3 w-3 ml-1" aria-hidden="true" />
              </Badge>
            )}
            {filters.resourceGroup && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800"
                onClick={() => removeFilter('resourceGroup')}
              >
                Group: {filters.resourceGroup}
                <X className="h-3 w-3 ml-1" aria-hidden="true" />
              </Badge>
            )}
            {filters.search && (
              <Badge
                variant="secondary"
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => removeFilter('search')}
              >
                Search: &quot;{filters.search}&quot;
                <X className="h-3 w-3 ml-1" aria-hidden="true" />
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
