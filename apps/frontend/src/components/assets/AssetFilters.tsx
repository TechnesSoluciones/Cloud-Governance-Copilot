'use client';

/**
 * Asset Filters Component
 *
 * Provides filtering controls for the asset inventory
 * Features:
 * - Provider selection (AWS, Azure, All)
 * - Resource type selection
 * - Region selection
 * - Status filter (Active, Terminated, All)
 * - Search by name/resourceId
 * - Clear filters button
 * - Responsive grid layout
 * - Accessibility features
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Search } from 'lucide-react';
import { AssetProvider, AssetStatus } from '@/lib/api/assets';

export interface AssetFiltersState {
  provider?: AssetProvider;
  resourceType?: string;
  region?: string;
  status?: AssetStatus;
  search?: string;
}

export interface AssetFiltersProps {
  filters: AssetFiltersState;
  onFiltersChange: (filters: AssetFiltersState) => void;
}

// Common AWS Resource Types
const AWS_RESOURCE_TYPES = [
  'EC2',
  'RDS',
  'S3',
  'Lambda',
  'EBS',
  'ELB',
  'VPC',
  'CloudFront',
  'DynamoDB',
  'ElastiCache',
];

// Common Azure Resource Types
const AZURE_RESOURCE_TYPES = [
  'VirtualMachine',
  'StorageAccount',
  'SQLDatabase',
  'AppService',
  'CosmosDB',
  'VirtualNetwork',
  'LoadBalancer',
  'KeyVault',
];

// Common AWS Regions
const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
];

// Common Azure Regions
const AZURE_REGIONS = [
  'eastus',
  'eastus2',
  'westus',
  'westus2',
  'centralus',
  'northeurope',
  'westeurope',
  'southeastasia',
];

/**
 * Asset Filters Component
 * Interactive filters for asset inventory
 */
export const AssetFilters: React.FC<AssetFiltersProps> = ({ filters, onFiltersChange }) => {
  const [searchInput, setSearchInput] = React.useState(filters.search || '');

  // Debounced search to avoid excessive re-renders
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Get resource types based on selected provider
  const getResourceTypes = () => {
    if (filters.provider === 'AWS') return AWS_RESOURCE_TYPES;
    if (filters.provider === 'AZURE') return AZURE_RESOURCE_TYPES;
    return [...AWS_RESOURCE_TYPES, ...AZURE_RESOURCE_TYPES].sort();
  };

  // Get regions based on selected provider
  const getRegions = () => {
    if (filters.provider === 'AWS') return AWS_REGIONS;
    if (filters.provider === 'AZURE') return AZURE_REGIONS;
    return [...AWS_REGIONS, ...AZURE_REGIONS].sort();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    onFiltersChange({
      provider: undefined,
      resourceType: undefined,
      region: undefined,
      status: undefined,
      search: undefined,
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.provider || filters.resourceType || filters.region || filters.status || filters.search;

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        {/* Top Row: Search and Provider */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search by name or resource ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-label="Search assets"
            />
          </div>

          {/* Provider Filter */}
          <Select
            value={filters.provider || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                provider: value === 'all' ? undefined : (value as AssetProvider),
                // Reset resource type and region when provider changes
                resourceType: undefined,
                region: undefined,
              })
            }
          >
            <SelectTrigger aria-label="Filter by provider">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="AWS">AWS</SelectItem>
              <SelectItem value="AZURE">Azure</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === 'all' ? undefined : (value as AssetStatus),
              })
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bottom Row: Resource Type and Region */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Resource Type Filter */}
          <Select
            value={filters.resourceType || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                resourceType: value === 'all' ? undefined : value,
              })
            }
            disabled={!filters.provider}
          >
            <SelectTrigger aria-label="Filter by resource type">
              <SelectValue placeholder="All Resource Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resource Types</SelectItem>
              {getResourceTypes().map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region Filter */}
          <Select
            value={filters.region || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                region: value === 'all' ? undefined : value,
              })
            }
            disabled={!filters.provider}
          >
            <SelectTrigger aria-label="Filter by region">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {getRegions().map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          <div className="lg:col-span-2 flex justify-end">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="w-full lg:w-auto"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {filters.provider && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs font-medium">
                Provider: {filters.provider}
              </span>
            )}
            {filters.resourceType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                Type: {filters.resourceType}
              </span>
            )}
            {filters.region && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                Region: {filters.region}
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                Status: {filters.status}
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-medium">
                Search: {filters.search}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
