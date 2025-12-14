/**
 * PageWrapper Migration Example
 *
 * This file shows a real-world example of migrating an existing page
 * from manual layout to using the PageWrapper component.
 *
 * Based on: /app/(dashboard)/dashboard/page.tsx
 */

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity, AuditEvent } from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';

/**
 * BEFORE: Manual Layout Implementation
 *
 * Issues:
 * - Manual padding classes repeated across pages
 * - Inconsistent spacing (space-y-6)
 * - No semantic HTML structure
 * - Missing accessibility labels
 * - Harder to maintain consistency
 */
export function DashboardPageBefore() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    cloudAccounts: 0,
    activeUsers: 0,
    recentAlerts: 0,
  });
  const [recentEvents, setRecentEvents] = React.useState<AuditEvent[]>([]);

  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        cloudAccounts: 3,
        activeUsers: 12,
        recentAlerts: 5,
      });
      setRecentEvents([
        /* mock events */
      ]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    // ❌ Manual padding and spacing - not semantic
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Cloud Accounts"
            value={stats.cloudAccounts}
            description="Connected providers"
            icon={<Icons.cloud />}
            trend={{ value: 20, isPositive: true }}
            variant="primary"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            description="Team members"
            icon={<Icons.users />}
            variant="success"
          />
          <StatCard
            title="Recent Alerts"
            value={stats.recentAlerts}
            description="Last 24 hours"
            icon={<Icons.alertTriangle />}
            trend={{ value: 10, isPositive: false }}
            variant="warning"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4"
          onClick={() => router.push('/cloud-accounts/new')}
        >
          <Icons.plus className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Connect Cloud Account</div>
            <div className="text-xs text-muted-foreground font-normal">
              Add AWS, Azure, or GCP
            </div>
          </div>
        </Button>
        {/* More buttons... */}
      </div>

      {/* Recent Activity */}
      <RecentActivity
        events={recentEvents}
        isLoading={isLoading}
        maxEvents={10}
        onViewAll={() => router.push('/audit-logs')}
      />
    </div>
  );
}

/**
 * AFTER: Using PageWrapper Component
 *
 * Benefits:
 * - Semantic HTML with <main> element
 * - Proper ARIA labels for accessibility
 * - Consistent padding across all pages
 * - Cleaner, more maintainable code
 * - Automatic spacing between sections
 * - Better SEO with proper semantic structure
 */
export function DashboardPageAfter() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    cloudAccounts: 0,
    activeUsers: 0,
    recentAlerts: 0,
  });
  const [recentEvents, setRecentEvents] = React.useState<AuditEvent[]>([]);

  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        cloudAccounts: 3,
        activeUsers: 12,
        recentAlerts: 5,
      });
      setRecentEvents([
        /* mock events */
      ]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    // ✅ Using PageWrapper with semantic HTML and accessibility
    <PageWrapper
      spacing="md"
      ariaLabel="Dashboard overview page"
    >
      {/* Header Section */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
      </header>

      {/* Stats Section */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Key Statistics
        </h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Cloud Accounts"
              value={stats.cloudAccounts}
              description="Connected providers"
              icon={<Icons.cloud />}
              trend={{ value: 20, isPositive: true }}
              variant="primary"
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              description="Team members"
              icon={<Icons.users />}
              variant="success"
            />
            <StatCard
              title="Recent Alerts"
              value={stats.recentAlerts}
              description="Last 24 hours"
              icon={<Icons.alertTriangle />}
              trend={{ value: 10, isPositive: false }}
              variant="warning"
            />
          </div>
        )}
      </section>

      {/* Quick Actions Section */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="sr-only">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/cloud-accounts/new')}
          >
            <Icons.plus className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Connect Cloud Account</div>
              <div className="text-xs text-muted-foreground font-normal">
                Add AWS, Azure, or GCP
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/audit-logs')}
          >
            <Icons.shield className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">View Audit Logs</div>
              <div className="text-xs text-muted-foreground font-normal">
                Track all activities
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => router.push('/settings/profile')}
          >
            <Icons.settings className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Manage Settings</div>
              <div className="text-xs text-muted-foreground font-normal">
                Profile and security
              </div>
            </div>
          </Button>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="sr-only">
          Recent Activity
        </h2>
        <RecentActivity
          events={recentEvents}
          isLoading={isLoading}
          maxEvents={10}
          onViewAll={() => router.push('/audit-logs')}
        />
      </section>
    </PageWrapper>
  );
}

/**
 * Code Comparison Summary
 *
 * Lines of code:
 * - Before: Manual div with classes
 * - After: PageWrapper component with props
 *
 * Accessibility improvements:
 * - Semantic <main> element instead of <div>
 * - Proper ARIA labels
 * - Semantic sections with proper heading hierarchy
 * - Screen reader support with sr-only headings
 *
 * Maintainability improvements:
 * - Centralized layout logic
 * - Consistent spacing via prop
 * - Easier to update globally
 * - Better TypeScript support
 *
 * Responsive behavior:
 * - Automatic responsive padding
 * - Consistent across all pages
 * - Mobile-first approach
 */

/**
 * Migration Checklist for Existing Pages
 *
 * 1. ✅ Replace manual padding div with PageWrapper
 * 2. ✅ Add appropriate spacing prop (sm, md, lg)
 * 3. ✅ Add maxWidth if needed (full, container, 4xl, 2xl)
 * 4. ✅ Wrap major sections in semantic <section> elements
 * 5. ✅ Add aria-labelledby to sections
 * 6. ✅ Add hidden headings (sr-only) for screen readers
 * 7. ✅ Use <header> for page header section
 * 8. ✅ Add custom ariaLabel to PageWrapper
 * 9. ✅ Test keyboard navigation
 * 10. ✅ Verify responsive behavior on mobile/tablet/desktop
 */

/**
 * Additional Examples: Different Page Types
 */

/**
 * Example: Settings Page (Narrow Layout)
 */
export function SettingsPageExample() {
  return (
    <PageWrapper
      maxWidth="2xl"
      spacing="sm"
      ariaLabel="Account settings page"
    >
      <header>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and security settings
        </p>
      </header>

      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-xl font-semibold mb-4">
          Profile Information
        </h2>
        {/* Profile form */}
      </section>

      <section aria-labelledby="security-heading">
        <h2 id="security-heading" className="text-xl font-semibold mb-4">
          Security Settings
        </h2>
        {/* Security settings */}
      </section>
    </PageWrapper>
  );
}

/**
 * Example: List Page with Breadcrumbs
 */
export function CloudAccountsPageExample() {
  const breadcrumbs = (
    <div className="flex items-center gap-2 text-sm">
      <a href="/dashboard" className="text-muted-foreground hover:text-foreground">
        Dashboard
      </a>
      <Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
      <span className="text-foreground font-medium">Cloud Accounts</span>
    </div>
  );

  return (
    <PageWrapper
      maxWidth="container"
      breadcrumbs={breadcrumbs}
      ariaLabel="Cloud accounts list page"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected cloud providers
          </p>
        </div>
        <Button>
          <Icons.plus className="mr-2 h-4 w-4" />
          Connect Account
        </Button>
      </header>

      <section aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="sr-only">
          Connected Accounts
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Account cards */}
        </div>
      </section>
    </PageWrapper>
  );
}

/**
 * Example: Full-Width Dashboard
 */
export function AnalyticsPageExample() {
  return (
    <PageWrapper
      maxWidth="full"
      spacing="lg"
      ariaLabel="Analytics dashboard page"
    >
      <header>
        <h1 className="text-3xl font-bold">Cost Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track and analyze your cloud spending
        </p>
      </header>

      <section aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">
          Key Performance Indicators
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* KPI cards */}
        </div>
      </section>

      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="text-2xl font-semibold mb-4">
          Spending Trends
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Charts */}
        </div>
      </section>
    </PageWrapper>
  );
}
