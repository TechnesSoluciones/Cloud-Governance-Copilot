'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { SimpleSelect } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import {
  RecommendationStatus,
  RecommendationType,
  RecommendationPriority,
  getRecommendationTypeLabel,
  getPriorityLabel,
} from '@/lib/api/recommendations';
import { Provider } from '@/lib/api/finops';

export interface RecommendationsFiltersProps {
  status?: RecommendationStatus;
  type?: RecommendationType;
  provider?: Provider;
  priority?: RecommendationPriority;
  onStatusChange?: (status: RecommendationStatus | undefined) => void;
  onTypeChange?: (type: RecommendationType | undefined) => void;
  onProviderChange?: (provider: Provider | undefined) => void;
  onPriorityChange?: (priority: RecommendationPriority | undefined) => void;
  onClearFilters?: () => void;
}

export const RecommendationsFilters: React.FC<RecommendationsFiltersProps> = ({
  status,
  type,
  provider,
  priority,
  onStatusChange,
  onTypeChange,
  onProviderChange,
  onPriorityChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    status !== undefined ||
    type !== undefined ||
    (provider !== undefined && provider !== 'ALL') ||
    priority !== undefined;

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'applied', label: 'Applied' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  const typeOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Types' },
    { value: 'idle_resource', label: getRecommendationTypeLabel('idle_resource') },
    { value: 'rightsize', label: getRecommendationTypeLabel('rightsize') },
    {
      value: 'reserved_instance',
      label: getRecommendationTypeLabel('reserved_instance'),
    },
    { value: 'unused_resource', label: getRecommendationTypeLabel('unused_resource') },
    { value: 'delete_snapshot', label: getRecommendationTypeLabel('delete_snapshot') },
  ];

  const providerOptions = [
    { value: 'ALL', label: 'All Providers' },
    { value: 'AWS', label: 'AWS' },
    { value: 'AZURE', label: 'Azure' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: getPriorityLabel('high') },
    { value: 'medium', label: getPriorityLabel('medium') },
    { value: 'low', label: getPriorityLabel('low') },
  ];

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onStatusChange?.(undefined);
    } else {
      onStatusChange?.(value as RecommendationStatus);
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'all') {
      onTypeChange?.(undefined);
    } else {
      onTypeChange?.(value as RecommendationType);
    }
  };

  const handleProviderChange = (value: string) => {
    if (value === 'ALL') {
      onProviderChange?.(undefined);
    } else {
      onProviderChange?.(value as Provider);
    }
  };

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      onPriorityChange?.(undefined);
    } else {
      onPriorityChange?.(value as RecommendationPriority);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Clear All
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <SimpleSelect
            label="Status"
            value={status || 'all'}
            onValueChange={handleStatusChange}
            options={statusOptions}
            placeholder="Select status"
          />

          {/* Type Filter */}
          <SimpleSelect
            label="Type"
            value={type || 'all'}
            onValueChange={handleTypeChange}
            options={typeOptions}
            placeholder="Select type"
          />

          {/* Provider Filter */}
          <SimpleSelect
            label="Provider"
            value={provider || 'ALL'}
            onValueChange={handleProviderChange}
            options={providerOptions}
            placeholder="Select provider"
          />

          {/* Priority Filter */}
          <SimpleSelect
            label="Priority"
            value={priority || 'all'}
            onValueChange={handlePriorityChange}
            options={priorityOptions}
            placeholder="Select priority"
          />
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-600">Active filters:</span>
            {status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cloud-blue/10 text-cloud-blue text-xs font-medium rounded-full">
                Status: {status}
                <button
                  onClick={() => onStatusChange?.(undefined)}
                  className="hover:bg-cloud-blue/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove status filter"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {type && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-orange/10 text-brand-orange text-xs font-medium rounded-full">
                Type: {getRecommendationTypeLabel(type)}
                <button
                  onClick={() => onTypeChange?.(undefined)}
                  className="hover:bg-brand-orange/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove type filter"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {provider && provider !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                Provider: {provider}
                <button
                  onClick={() => onProviderChange?.(undefined)}
                  className="hover:bg-success/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove provider filter"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {priority && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
                Priority: {getPriorityLabel(priority)}
                <button
                  onClick={() => onPriorityChange?.(undefined)}
                  className="hover:bg-warning/20 rounded-full p-0.5 transition-colors"
                  aria-label="Remove priority filter"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecommendationsFilters;
