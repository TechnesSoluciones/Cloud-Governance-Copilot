'use client';

/**
 * Advanced Filters Component for Asset Inventory
 *
 * Comprehensive filtering interface with multiple filter types:
 * - Resource type (multi-select)
 * - Location/Region (multi-select)
 * - Status (checkbox group)
 * - Tags (key-value pairs)
 * - Orphaned resources toggle
 * - Cost range slider
 *
 * Features:
 * - Collapsible filter panel
 * - Filter persistence
 * - Clear all functionality
 * - Active filter count badge
 * - Responsive design
 * - Accessibility compliant
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Filter state interface
export interface AdvancedFiltersState {
  resourceTypes: string[];
  regions: string[];
  statuses: string[];
  tags: Record<string, string>;
  showOrphanedOnly: boolean;
  costRange: {
    min: number;
    max: number;
  };
}

// Component props
export interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  availableTypes?: string[];
  availableRegions?: string[];
  className?: string;
}

// Default filter values
const DEFAULT_FILTERS: AdvancedFiltersState = {
  resourceTypes: [],
  regions: [],
  statuses: [],
  tags: {},
  showOrphanedOnly: false,
  costRange: {
    min: 0,
    max: 10000,
  },
};

// Available resource statuses
const RESOURCE_STATUSES = [
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'deallocated', label: 'Deallocated' },
  { value: 'failed', label: 'Failed' },
];

// Common tag presets
const TAG_PRESETS = {
  Environment: ['Production', 'Staging', 'Development', 'Test'],
  Owner: [],
  Project: [],
  Department: ['Engineering', 'Operations', 'Finance', 'Marketing'],
};

/**
 * AdvancedFilters Component
 * Provides comprehensive filtering interface for asset inventory
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  availableTypes = [],
  availableRegions = [],
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.resourceTypes.length > 0) count++;
    if (filters.regions.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (Object.keys(filters.tags).length > 0) count++;
    if (filters.showOrphanedOnly) count++;
    if (filters.costRange.min > 0 || filters.costRange.max < 10000) count++;
    return count;
  }, [filters]);

  // Handle resource type toggle
  const handleTypeToggle = (type: string) => {
    const newTypes = filters.resourceTypes.includes(type)
      ? filters.resourceTypes.filter((t) => t !== type)
      : [...filters.resourceTypes, type];

    onFiltersChange({ ...filters, resourceTypes: newTypes });
  };

  // Handle region toggle
  const handleRegionToggle = (region: string) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter((r) => r !== region)
      : [...filters.regions, region];

    onFiltersChange({ ...filters, regions: newRegions });
  };

  // Handle status toggle
  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];

    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  // Handle add tag
  const handleAddTag = () => {
    if (tagKey.trim() && tagValue.trim()) {
      const newTags = { ...filters.tags, [tagKey.trim()]: tagValue.trim() };
      onFiltersChange({ ...filters, tags: newTags });
      setTagKey('');
      setTagValue('');
    }
  };

  // Handle remove tag
  const handleRemoveTag = (key: string) => {
    const newTags = { ...filters.tags };
    delete newTags[key];
    onFiltersChange({ ...filters, tags: newTags });
  };

  // Handle clear all filters
  const handleClearAll = () => {
    onFiltersChange(DEFAULT_FILTERS);
    setTagKey('');
    setTagValue('');
  };

  // Handle cost range change
  const handleCostRangeChange = (type: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      costRange: {
        ...filters.costRange,
        [type]: value,
      },
    });
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="advanced-filters-content"
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-500" aria-hidden="true" />
          <h3 className="font-semibold text-lg">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="bg-brand-orange">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
        )}
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div id="advanced-filters-content" className="p-4 space-y-6">
          {/* Resource Type */}
          {availableTypes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Resource Type</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTypes.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.resourceTypes.includes(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Region */}
          {availableRegions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Location / Region</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableRegions.map((region) => (
                  <div key={region} className="flex items-center gap-2">
                    <Checkbox
                      id={`region-${region}`}
                      checked={filters.regions.includes(region)}
                      onCheckedChange={() => handleRegionToggle(region)}
                    />
                    <label
                      htmlFor={`region-${region}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {region}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="space-y-2">
              {RESOURCE_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
                  />
                  <label
                    htmlFor={`status-${status.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {status.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tags</Label>

            {/* Existing tags */}
            {Object.keys(filters.tags).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(filters.tags).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="text-xs">
                      {key}: {value}
                    </span>
                    <button
                      onClick={() => handleRemoveTag(key)}
                      className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                      aria-label={`Remove tag ${key}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Key (e.g., Owner)"
                  value={tagKey}
                  onChange={(e) => setTagKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  aria-label="Tag key"
                />
                <Input
                  placeholder="Value"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  aria-label="Tag value"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagKey.trim() || !tagValue.trim()}
                className="w-full"
              >
                Add Tag Filter
              </Button>
            </div>
          </div>

          {/* Orphaned Resources */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
              <Checkbox
                id="orphaned-only"
                checked={filters.showOrphanedOnly}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, showOrphanedOnly: checked === true })
                }
              />
              <div className="flex-1">
                <label
                  htmlFor="orphaned-only"
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Show Orphaned Resources Only
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Resources with missing or incomplete tags
                </p>
              </div>
            </div>
          </div>

          {/* Cost Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              Monthly Cost Range
            </Label>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cost-min" className="text-xs text-gray-500">
                    Min ($)
                  </Label>
                  <Input
                    id="cost-min"
                    type="number"
                    min={0}
                    value={filters.costRange.min}
                    onChange={(e) =>
                      handleCostRangeChange('min', parseInt(e.target.value) || 0)
                    }
                    aria-label="Minimum cost"
                  />
                </div>
                <div>
                  <Label htmlFor="cost-max" className="text-xs text-gray-500">
                    Max ($)
                  </Label>
                  <Input
                    id="cost-max"
                    type="number"
                    min={0}
                    value={filters.costRange.max}
                    onChange={(e) =>
                      handleCostRangeChange('max', parseInt(e.target.value) || 10000)
                    }
                    aria-label="Maximum cost"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                ${filters.costRange.min.toLocaleString()} - $
                {filters.costRange.max.toLocaleString()}/month
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={activeFilterCount === 0}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear All
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
