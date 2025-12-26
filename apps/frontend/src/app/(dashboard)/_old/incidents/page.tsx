/**
 * Incidents List Page
 * Displays all incidents with filtering, sorting, and pagination
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidents, extractIncidentsData } from '@/hooks/useIncidents';
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
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
  AlertOctagon,
  AlertCircle,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PremiumEmptyState,
  EmptyStateVariants,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS,
} from '@/components/shared/premium';

export default function IncidentsPage() {
  const router = useRouter();
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

  // Get user's cloud accounts using centralized hook
  const {
    cloudAccounts,
    selectedAccount,
    isLoading: accountsLoading,
  } = useCloudAccounts();

  // Build query params
  const queryParams = {
    accountId: selectedAccount?.id,
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

  // Check for authentication errors
  const hasAuthError = error && error.message?.includes('authentication');

  // Show authentication error state
  if (hasAuthError) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
          <PremiumSectionHeader
            title="Incident Management"
            subtitle="Monitor and manage cloud infrastructure incidents"
          />
          <Card className="p-12 text-center border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-100">Authentication Required</h3>
                <p className="text-red-700 dark:text-red-300">
                  Your session may have expired. Please sign in again to access incidents.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push('/auth/signin')}
                className="shadow-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show empty state when no cloud accounts are configured
  if (!accountsLoading && cloudAccounts.length === 0) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
          <PremiumSectionHeader
            title="Incident Management"
            subtitle="Monitor and manage cloud infrastructure incidents"
          />
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <Server className="h-12 w-12 text-orange-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">No Cloud Accounts Connected</h3>
                <p className="text-muted-foreground">
                  Connect your first cloud account to start monitoring incidents.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push('/cloud-accounts/new')}
                className="shadow-lg"
              >
                <Icons.plus className="h-5 w-5 mr-2" />
                Add Cloud Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Incident Management"
          subtitle="Monitor and manage cloud infrastructure incidents"
          actions={
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 shadow-lg"
                aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="gap-2 shadow-lg"
                aria-label="Refresh incidents"
              >
                <RefreshCw
                  className={cn('h-5 w-5', isRefetching && 'animate-spin')}
                  aria-hidden="true"
                />
                {isRefetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </>
          }
        />

        {/* Premium Stats Bar */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          <PremiumStatsBar
            stats={[
              {
                label: 'Active Incidents',
                value: incidentsData.metadata.activeCount,
                icon: <Activity className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: 'Currently open',
              },
              {
                label: 'Critical',
                value: incidentsData.metadata.criticalCount,
                icon: <AlertOctagon className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.error,
                iconColor: PREMIUM_ICON_COLORS.error,
                subtitle: 'Require immediate action',
              },
              {
                label: 'High Priority',
                value: incidentsData.metadata.highCount,
                icon: <AlertTriangle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.warning,
                iconColor: PREMIUM_ICON_COLORS.warning,
                subtitle: 'Needs attention',
              },
              {
                label: 'Total Incidents',
                value: incidentsData.pagination.total,
                icon: <TrendingUp className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.info,
                iconColor: PREMIUM_ICON_COLORS.info,
                subtitle: `Last updated: ${lastUpdated}`,
              },
            ]}
          />
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

      {/* Empty State - No Incidents */}
      {!isLoading && !error && incidentsData && incidentsData.data.length === 0 ? (
        <PremiumEmptyState
          {...EmptyStateVariants.noIncidents()}
        />
      ) : (
        /* Main Content */
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
      )}
      </div>
    </div>
  );
}
