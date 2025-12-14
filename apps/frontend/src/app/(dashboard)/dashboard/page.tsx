'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatCardGridSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/hooks/useDashboard';

// Azure Dashboard Components
import { OverviewCards } from '@/components/dashboard/azure/OverviewCards';
import { ResourceDistribution } from '@/components/dashboard/azure/ResourceDistribution';
import { HealthStatus } from '@/components/dashboard/azure/HealthStatus';
import { RecentActivity } from '@/components/dashboard/azure/RecentActivity';

/**
 * Azure Dashboard Page
 * Displays overview cards, resource distribution charts, health status, and recent activity
 * Uses useDashboard hook for data fetching with auto-refresh every 5 minutes
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // TODO: Replace with actual account selection logic
  // For now, using a placeholder - in production, get from user's selected account or first Azure account
  const accountId = 'azure-account-1';

  const {
    overview,
    health,
    isLoading,
    error,
    refetch,
    isRefetching,
    lastUpdated,
  } = useDashboard(accountId);

  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';

  // Format last updated time
  const formatLastUpdated = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading state during initial session load
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Azure Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {userName}
          </p>
        </div>

        {/* Refresh Button with Auto-refresh Indicator */}
        <div className="flex items-center gap-3">
          {lastUpdated > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icons.clock className="h-3 w-3" aria-hidden="true" />
              <span>Updated {formatLastUpdated(lastUpdated)}</span>
              <Badge variant="secondary" className="text-xs">
                Auto-refresh: 5min
              </Badge>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            aria-label="Refresh dashboard data"
          >
            <Icons.refresh
              className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <Alert variant="error" className="flex items-start gap-3">
          <Icons.alertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold">Failed to load dashboard data</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <StatCardGridSkeleton count={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <CardSkeleton rows={6} />
            <CardSkeleton rows={6} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CardSkeleton rows={5} />
            <CardSkeleton rows={5} />
          </div>
          <CardSkeleton rows={8} />
        </>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && overview && health && (
        <>
          {/* Overview Cards - Total Resources, Costs, Security, Alerts */}
          <OverviewCards overview={overview} />

          {/* Resource Distribution Charts */}
          <ResourceDistribution overview={overview} />

          {/* Health Status and Resources by Location */}
          <HealthStatus health={health} />

          {/* Recent Activity Feed */}
          <RecentActivity health={health} maxItems={10} />
        </>
      )}

      {/* Empty State - No Data */}
      {!isLoading && !error && (!overview || !health) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.cloud className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold mb-2">No dashboard data available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Make sure your Azure account is properly configured.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/cloud-accounts')}
            >
              <Icons.settings className="h-4 w-4 mr-2" />
              Manage Accounts
            </Button>
            <Button onClick={() => refetch()}>
              <Icons.refresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isLoading && !error && overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/costs')}
          >
            <Icons.dollarSign className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Cost Analysis</div>
              <div className="text-xs text-muted-foreground font-normal">
                View detailed cost breakdown
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/security')}
          >
            <Icons.shield className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Security Dashboard</div>
              <div className="text-xs text-muted-foreground font-normal">
                Review security findings
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/assets')}
          >
            <Icons.server className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">View All Resources</div>
              <div className="text-xs text-muted-foreground font-normal">
                Explore resource inventory
              </div>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
