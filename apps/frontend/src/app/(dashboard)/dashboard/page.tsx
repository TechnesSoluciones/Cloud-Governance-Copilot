'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatCardGridSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useDashboard } from '@/hooks/useDashboard';
import { Server, DollarSign, Shield, Bell, RefreshCw } from 'lucide-react';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_BACKGROUNDS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS
} from '@/components/shared/premium';

// Azure Dashboard Components
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

  // Get user's cloud accounts
  const [cloudAccounts, setCloudAccounts] = React.useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = React.useState(true);

  // Fetch cloud accounts on mount
  React.useEffect(() => {
    const fetchAccounts = async () => {
      if (!session) return;

      try {
        const response = await fetch('/api/v1/cloud-accounts', {
          headers: {
            'Authorization': `Bearer ${(session as any).accessToken}`
          }
        });
        const data = await response.json();

        if (data.success && data.data) {
          setCloudAccounts(data.data);
          // Auto-select first account if available
          if (data.data.length > 0) {
            setSelectedAccountId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch cloud accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, [session]);

  const {
    overview,
    health,
    isLoading,
    error,
    refetch,
    isRefetching,
    lastUpdated,
  } = useDashboard(selectedAccountId || '');

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

  // Show empty state when no cloud accounts are configured
  if (!accountsLoading && cloudAccounts.length === 0) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          <PremiumSectionHeader
            title="Azure Dashboard"
            subtitle={`Welcome back, ${userName}`}
          />
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <Server className="h-12 w-12 text-orange-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">No Cloud Accounts Connected</h3>
                <p className="text-muted-foreground">
                  Connect your first cloud account to start monitoring your infrastructure, costs, and security.
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
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Azure Dashboard"
          subtitle={`Welcome back, ${userName}`}
          actions={
            <>
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
                size="lg"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="shadow-lg"
                aria-label="Refresh dashboard data"
              >
                <RefreshCw
                  className={`h-5 w-5 mr-2 ${isRefetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {isRefetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </>
          }
        />

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
          {/* Premium Stats Bar - KPI Metrics */}
          <PremiumStatsBar
            stats={[
              {
                label: 'Total Resources',
                value: overview.resources.total.toLocaleString(),
                icon: <Server className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: `Across ${overview.resources.byLocation.length} location${overview.resources.byLocation.length !== 1 ? 's' : ''}`,
              },
              {
                label: 'Monthly Cost',
                value: `$${overview.costs.currentMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: <DollarSign className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.warning,
                iconColor: PREMIUM_ICON_COLORS.warning,
                trend: {
                  value: overview.costs.percentageChange,
                  direction: overview.costs.trend === 'up' ? 'up' : overview.costs.trend === 'down' ? 'down' : 'stable',
                },
                subtitle: 'vs last month',
              },
              {
                label: 'Security Score',
                value: `${overview.security.score}/100`,
                icon: <Shield className="h-14 w-14" />,
                iconBg: overview.security.score >= 80 ? PREMIUM_GRADIENTS.success : overview.security.score >= 60 ? PREMIUM_GRADIENTS.warning : PREMIUM_GRADIENTS.error,
                iconColor: overview.security.score >= 80 ? PREMIUM_ICON_COLORS.success : overview.security.score >= 60 ? PREMIUM_ICON_COLORS.warning : PREMIUM_ICON_COLORS.error,
                subtitle: `${overview.security.criticalIssues} critical, ${overview.security.highIssues} high`,
              },
              {
                label: 'Active Alerts',
                value: overview.alerts.active,
                icon: <Bell className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.error,
                iconColor: PREMIUM_ICON_COLORS.error,
                subtitle: `${overview.alerts.recent.length} in last 24 hours`,
              },
            ]}
          />

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

      {/* Premium Quick Actions */}
      {!isLoading && !error && overview && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className={`cursor-pointer border-2 ${PREMIUM_TRANSITIONS.card} hover:shadow-xl hover:-translate-y-1 hover:border-orange-400/20`}
            onClick={() => router.push('/costs')}
          >
            <div className="p-6 flex items-start gap-4">
              <div className={`p-3 rounded-xl ${PREMIUM_GRADIENTS.warning}`}>
                <Icons.dollarSign className={`h-10 w-10 ${PREMIUM_ICON_COLORS.warning}`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">Cost Analysis</div>
                <div className="text-sm text-muted-foreground mt-1">
                  View detailed cost breakdown
                </div>
              </div>
            </div>
          </Card>
          <Card
            className={`cursor-pointer border-2 ${PREMIUM_TRANSITIONS.card} hover:shadow-xl hover:-translate-y-1 hover:border-orange-400/20`}
            onClick={() => router.push('/security')}
          >
            <div className="p-6 flex items-start gap-4">
              <div className={`p-3 rounded-xl ${PREMIUM_GRADIENTS.error}`}>
                <Icons.shield className={`h-10 w-10 ${PREMIUM_ICON_COLORS.error}`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">Security Dashboard</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Review security findings
                </div>
              </div>
            </div>
          </Card>
          <Card
            className={`cursor-pointer border-2 ${PREMIUM_TRANSITIONS.card} hover:shadow-xl hover:-translate-y-1 hover:border-orange-400/20`}
            onClick={() => router.push('/assets')}
          >
            <div className="p-6 flex items-start gap-4">
              <div className={`p-3 rounded-xl ${PREMIUM_GRADIENTS.azure}`}>
                <Icons.server className={`h-10 w-10 ${PREMIUM_ICON_COLORS.azure}`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">View All Resources</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Explore resource inventory
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
