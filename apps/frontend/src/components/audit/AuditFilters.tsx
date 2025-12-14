'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { SimpleSelect, SelectOption } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export interface AuditFiltersState {
  search: string;
  actionType: string;
  user: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export interface AuditFiltersProps {
  filters: AuditFiltersState;
  onChange: (filters: AuditFiltersState) => void;
  onReset: () => void;
}

const actionTypeOptions: SelectOption[] = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'access', label: 'Access' },
  { value: 'configure', label: 'Configure' },
];

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'pending', label: 'Pending' },
];

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleChange = (field: keyof AuditFiltersState, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  const hasActiveFilters = React.useMemo(() => {
    return (
      filters.search !== '' ||
      filters.actionType !== 'all' ||
      filters.user !== '' ||
      filters.status !== 'all' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== ''
    );
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Primary Filters - Always Visible */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search audit logs..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            aria-label="Search audit logs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls="advanced-filters"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={onReset} aria-label="Clear all filters">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div id="advanced-filters" className="grid gap-4 p-4 border rounded-lg bg-muted/50 sm:grid-cols-2 lg:grid-cols-4">
          <SimpleSelect
            label="Action Type"
            value={filters.actionType}
            onValueChange={(value) => handleChange('actionType', value)}
            options={actionTypeOptions}
            placeholder="Select action type"
          />
          <SimpleSelect
            label="Status"
            value={filters.status}
            onValueChange={(value) => handleChange('status', value)}
            options={statusOptions}
            placeholder="Select status"
          />
          <div className="space-y-2">
            <label htmlFor="dateFrom" className="text-sm font-medium">
              Date From
            </label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
              max={filters.dateTo || format(new Date(), 'yyyy-MM-dd')}
              aria-label="Filter from date"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="dateTo" className="text-sm font-medium">
              Date To
            </label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
              min={filters.dateFrom}
              max={format(new Date(), 'yyyy-MM-dd')}
              aria-label="Filter to date"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="user" className="text-sm font-medium">
              User Email
            </label>
            <Input
              id="user"
              type="text"
              placeholder="user@example.com"
              value={filters.user}
              onChange={(e) => handleChange('user', e.target.value)}
              aria-label="Filter by user email"
            />
          </div>
        </div>
      )}
    </div>
  );
};
