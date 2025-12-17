/**
 * Incidents List Page
 * Displays all incidents with filtering, sorting, and pagination
 */

'use client';

import { useState, useEffect } from 'react';
import { useIncidents, extractIncidentsData } from '@/hooks/useIncidents';
import { IncidentsList } from '@/components/incidents/IncidentsList';
import {
  IncidentFilters,
  IncidentFiltersState,
} from '@/components/incidents/IncidentFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  X,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IncidentsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<IncidentFiltersState>({
    severity: [],
    status: [],
    dateFrom: undefined,
    dateTo: undefined,
    resourceType: undefined,
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'severity' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Build query params
  const queryParams = {
    ...(filters.severity.length > 0 && { severity: filters.severity }),
    ...(filters.status.length > 0 && { status: filters.status }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
    ...(filters.resourceType && { resourceType: filters.resourceType }),
    page,
    limit: 20,
    sortBy,
    sortOrder,
  };

  // Fetch incidents
  const {
    data: incidentsResponse,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useIncidents(queryParams);

  const incidentsData = extractIncidentsData(incidentsResponse);

  // Auto-refresh every 60 seconds is handled by React Query
  // Show last updated time
  const lastUpdated = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true })
    : 'Never';

  const handleFiltersChange = (newFilters: IncidentFiltersState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSort = (field: 'severity' | 'createdAt' | 'updatedAt') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const activeFiltersCount =
    filters.severity.length +
    filters.status.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.resourceType ? 1 : 0);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Incident Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor and manage cloud infrastructure incidents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-2"
            aria-label="Refresh incidents"
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefetching && 'animate-spin')}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : incidentsData ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-500" aria-hidden="true" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {incidentsData.metadata.activeCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" aria-hidden="true" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {incidentsData.metadata.criticalCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-500" aria-hidden="true" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {incidentsData.metadata.highCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {incidentsData.pagination.total}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Failed to load incidents:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="flex items-center justify-between lg:hidden">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Filters
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <IncidentFilters filters={filters} onFiltersChange={handleFiltersChange} />
            </div>
          </div>
        )}

        {/* Incidents List */}
        <div className={cn(showFilters ? 'lg:col-span-3' : 'lg:col-span-4')}>
          <IncidentsList
            incidents={incidentsData?.data || []}
            isLoading={isLoading}
            pagination={incidentsData?.pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      </div>
    </div>
  );
}
