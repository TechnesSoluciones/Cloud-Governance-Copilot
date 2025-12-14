'use client';

/**
 * Security Filters Component
 *
 * Provides filtering controls for security findings
 * Features:
 * - Severity selection (Critical, High, Medium, Low, All)
 * - Category selection
 * - Status filter (Open, Resolved, Dismissed, All)
 * - Cloud Account selection
 * - Clear filters button
 * - Active filters summary
 * - Responsive grid layout
 * - Accessibility features
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { FindingSeverity, FindingStatus } from '@/lib/api/security';

export interface SecurityFiltersState {
  severity?: FindingSeverity;
  category?: string;
  status?: FindingStatus;
  cloudAccountId?: string;
}

export interface SecurityFiltersProps {
  filters: SecurityFiltersState;
  onFiltersChange: (filters: SecurityFiltersState) => void;
  categories?: string[];
  cloudAccounts?: Array<{ id: string; name: string }>;
}

// Common security categories (based on CIS benchmarks and common findings)
const DEFAULT_CATEGORIES = [
  'Access Control',
  'Authentication',
  'Authorization',
  'Data Protection',
  'Encryption',
  'Identity Management',
  'Logging & Monitoring',
  'Network Security',
  'Resource Configuration',
  'Secrets Management',
  'Storage Security',
  'Vulnerability',
];

/**
 * Security Filters Component
 * Interactive filters for security findings
 */
export const SecurityFilters: React.FC<SecurityFiltersProps> = ({
  filters,
  onFiltersChange,
  categories = DEFAULT_CATEGORIES,
  cloudAccounts = [],
}) => {
  // Clear all filters
  const handleClearFilters = () => {
    onFiltersChange({
      severity: undefined,
      category: undefined,
      status: undefined,
      cloudAccountId: undefined,
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.severity || filters.category || filters.status || filters.cloudAccountId;

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Severity Filter */}
          <Select
            value={filters.severity || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                severity: value === 'all' ? undefined : (value as FindingSeverity),
              })
            }
          >
            <SelectTrigger aria-label="Filter by severity">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="CRITICAL">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600"></span>
                  Critical
                </span>
              </SelectItem>
              <SelectItem value="HIGH">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-600"></span>
                  High
                </span>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-600"></span>
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="LOW">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-600"></span>
                  Low
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                category: value === 'all' ? undefined : value,
              })
            }
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === 'all' ? undefined : (value as FindingStatus),
              })
            }
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600"></span>
                  Open
                </span>
              </SelectItem>
              <SelectItem value="resolved">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                  Resolved
                </span>
              </SelectItem>
              <SelectItem value="dismissed">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-600"></span>
                  Dismissed
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Cloud Account Filter */}
          <Select
            value={filters.cloudAccountId || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                cloudAccountId: value === 'all' ? undefined : value,
              })
            }
          >
            <SelectTrigger aria-label="Filter by cloud account">
              <SelectValue placeholder="All Cloud Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cloud Accounts</SelectItem>
              {cloudAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            size="sm"
          >
            <X className="h-4 w-4 mr-2" aria-hidden="true" />
            Clear Filters
          </Button>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
            {filters.severity && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-medium">
                Severity: {filters.severity}
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                Category: {filters.category}
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                Status: {filters.status}
              </span>
            )}
            {filters.cloudAccountId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">
                Cloud Account:{' '}
                {cloudAccounts.find((a) => a.id === filters.cloudAccountId)?.name ||
                  filters.cloudAccountId}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
