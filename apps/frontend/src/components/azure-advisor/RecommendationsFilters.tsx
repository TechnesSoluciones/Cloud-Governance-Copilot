/**
 * RecommendationsFilters Component
 *
 * Provides filtering UI for Azure Advisor recommendations.
 *
 * Features:
 * - Category filter (Cost, Security, Reliability, Performance, OperationalExcellence)
 * - Impact filter (High, Medium, Low)
 * - Status filter (Active, Suppressed, Dismissed, Resolved)
 * - Search filter
 * - Clear all filters button
 * - Responsive layout
 * - Accessibility support
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
import { Search, X } from 'lucide-react';
import {
  AdvisorCategory,
  AdvisorImpact,
  AdvisorStatus,
  RecommendationFilters,
  getCategoryLabel,
} from '@/types/azure-advisor';

export interface RecommendationsFiltersProps {
  filters: RecommendationFilters;
  onFiltersChange: (filters: RecommendationFilters) => void;
  showSearch?: boolean;
  className?: string;
}

/**
 * Category Options
 */
const CATEGORY_OPTIONS: Array<{ value: AdvisorCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'Cost', label: 'Cost Optimization' },
  { value: 'Security', label: 'Security' },
  { value: 'Reliability', label: 'Reliability' },
  { value: 'Performance', label: 'Performance' },
  { value: 'OperationalExcellence', label: 'Operational Excellence' },
];

/**
 * Impact Options
 */
const IMPACT_OPTIONS: Array<{ value: AdvisorImpact | 'all'; label: string }> = [
  { value: 'all', label: 'All Impact Levels' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

/**
 * Status Options
 */
const STATUS_OPTIONS: Array<{ value: AdvisorStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Suppressed', label: 'Suppressed' },
  { value: 'Dismissed', label: 'Dismissed' },
  { value: 'Resolved', label: 'Resolved' },
];

export function RecommendationsFilters({
  filters,
  onFiltersChange,
  showSearch = true,
  className = '',
}: RecommendationsFiltersProps) {
  // Track if any filters are active
  const hasActiveFilters = React.useMemo(() => {
    return (
      (filters.category && filters.category !== 'all') ||
      (filters.impact && filters.impact !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      !!filters.searchQuery
    );
  }, [filters]);

  /**
   * Handle category change
   */
  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category: value as AdvisorCategory | 'all',
    });
  };

  /**
   * Handle impact change
   */
  const handleImpactChange = (value: string) => {
    onFiltersChange({
      ...filters,
      impact: value as AdvisorImpact | 'all',
    });
  };

  /**
   * Handle status change
   */
  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as AdvisorStatus | 'all',
    });
  };

  /**
   * Handle search query change
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      searchQuery: event.target.value,
    });
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    onFiltersChange({
      category: 'all',
      impact: 'all',
      status: 'all',
      searchQuery: '',
    });
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div className="space-y-2">
            <label
              htmlFor="category-filter"
              className="text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <Select
              value={filters.category || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="category-filter" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact Filter */}
          <div className="space-y-2">
            <label
              htmlFor="impact-filter"
              className="text-sm font-medium text-gray-700"
            >
              Impact Level
            </label>
            <Select
              value={filters.impact || 'all'}
              onValueChange={handleImpactChange}
            >
              <SelectTrigger id="impact-filter" className="w-full">
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status-filter" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block sm:hidden lg:block">
              Actions
            </label>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="w-full"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="space-y-2">
            <label
              htmlFor="search-filter"
              className="text-sm font-medium text-gray-700"
            >
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <Input
                id="search-filter"
                type="text"
                placeholder="Search recommendations by description or resource..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className="pl-10"
                aria-label="Search recommendations"
              />
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              Active Filters:
            </span>
            {filters.category && filters.category !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Category: {getCategoryLabel(filters.category as AdvisorCategory)}
              </span>
            )}
            {filters.impact && filters.impact !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Impact: {filters.impact}
              </span>
            )}
            {filters.status && filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Status: {filters.status}
              </span>
            )}
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Search: &ldquo;{filters.searchQuery}&rdquo;
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Compact Filters Component (for smaller spaces)
 */
export interface CompactFiltersProps {
  filters: RecommendationFilters;
  onFiltersChange: (filters: RecommendationFilters) => void;
  className?: string;
}

export function CompactRecommendationsFilters({
  filters,
  onFiltersChange,
  className = '',
}: CompactFiltersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Category Filter */}
      <Select
        value={filters.category || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, category: value as AdvisorCategory | 'all' })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Impact Filter */}
      <Select
        value={filters.impact || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, impact: value as AdvisorImpact | 'all' })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Impact" />
        </SelectTrigger>
        <SelectContent>
          {IMPACT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value as AdvisorStatus | 'all' })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
