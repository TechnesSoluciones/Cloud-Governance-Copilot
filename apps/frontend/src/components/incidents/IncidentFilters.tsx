/**
 * IncidentFilters Component
 * Provides filtering interface for incidents list
 */

'use client';

import { useState, useEffect } from 'react';
import { IncidentSeverity, IncidentStatus } from '@/lib/api/incidents';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IncidentFiltersState {
  severity: IncidentSeverity[];
  status: IncidentStatus[];
  dateFrom?: string;
  dateTo?: string;
  resourceType?: string;
}

interface IncidentFiltersProps {
  filters: IncidentFiltersState;
  onFiltersChange: (filters: IncidentFiltersState) => void;
  className?: string;
}

const severityOptions: { value: IncidentSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusOptions: { value: IncidentStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function IncidentFilters({ filters, onFiltersChange, className }: IncidentFiltersProps) {
  const [localFilters, setLocalFilters] = useState<IncidentFiltersState>(filters);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSeverityToggle = (severity: IncidentSeverity) => {
    setLocalFilters(prev => ({
      ...prev,
      severity: prev.severity.includes(severity)
        ? prev.severity.filter(s => s !== severity)
        : [...prev.severity, severity],
    }));
  };

  const handleStatusToggle = (status: IncidentStatus) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleResourceTypeChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      resourceType: value || undefined,
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleClear = () => {
    const clearedFilters: IncidentFiltersState = {
      severity: [],
      status: [],
      dateFrom: undefined,
      dateTo: undefined,
      resourceType: undefined,
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFiltersCount =
    localFilters.severity.length +
    localFilters.status.length +
    (localFilters.dateFrom ? 1 : 0) +
    (localFilters.dateTo ? 1 : 0) +
    (localFilters.resourceType ? 1 : 0);

  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);

  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-auto p-1 text-xs"
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {/* Severity Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Severity</Label>
            <div className="space-y-2">
              {severityOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${option.value}`}
                    checked={localFilters.severity.includes(option.value)}
                    onCheckedChange={() => handleSeverityToggle(option.value)}
                    aria-label={`Filter by ${option.label} severity`}
                  />
                  <label
                    htmlFor={`severity-${option.value}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="space-y-2">
              {statusOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.status.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                    aria-label={`Filter by ${option.label} status`}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="date-from" className="text-xs text-gray-600 dark:text-gray-400">
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={e => handleDateChange('dateFrom', e.target.value)}
                  className="mt-1"
                  aria-label="Filter from date"
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs text-gray-600 dark:text-gray-400">
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={e => handleDateChange('dateTo', e.target.value)}
                  className="mt-1"
                  aria-label="Filter to date"
                />
              </div>
            </div>
          </div>

          {/* Resource Type Filter */}
          <div className="space-y-3">
            <Label htmlFor="resource-type" className="text-sm font-medium">
              Resource Type
            </Label>
            <Input
              id="resource-type"
              type="text"
              placeholder="e.g., VirtualMachine, Database"
              value={localFilters.resourceType || ''}
              onChange={e => handleResourceTypeChange(e.target.value)}
              aria-label="Filter by resource type"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        <Button
          onClick={handleApply}
          className="flex-1"
          disabled={!hasChanges}
          aria-label="Apply filters"
        >
          Apply Filters
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          className="flex-1"
          disabled={activeFiltersCount === 0}
          aria-label="Clear all filters"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
