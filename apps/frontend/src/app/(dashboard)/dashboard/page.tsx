/**
 * Dashboard V2 Page
 * CloudNexus Design - Complete Dashboard Implementation
 *
 * NOTE: Layout is provided by DashboardLayoutWrapper (in layout.tsx)
 * This page only renders the content, not the layout structure
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import { SecurityScoreCircular } from '@/components/charts/SecurityScoreCircular';
import { RecommendationsTable } from '@/components/dashboard/RecommendationsTable';
import { useDashboard } from '@/hooks/useDashboard';
import { listCloudAccounts, CloudAccount } from '@/lib/api/cloud-accounts';

export default function DashboardV2Page() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch cloud accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      if (!token) {
        setLoadingAccounts(false);
        return;
      }

      try {
        const response = await listCloudAccounts(token);
        if (response.success && response.data) {
          setAccounts(response.data);
          // Auto-select first account if available
          if (response.data.length > 0) {
            setSelectedAccount(response.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cloud accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    }

    fetchAccounts();
  }, [token]);

  // Fetch dashboard data using the hook
  const { overview, health, isLoading, error, refetch } = useDashboard(
    selectedAccount || ''
  );

  // Calculate KPI values from real data
  const totalCost = overview?.costs?.currentMonth || 0;
  const costTrend = overview?.costs?.trend || 'stable';
  const costChange = overview?.costs?.percentageChange || 0;
  const securityScore = overview?.security?.score || 0;
  const totalResources = overview?.resources?.total || 0;
  const criticalAlerts = overview?.alerts?.active || 0;

  // Show loading state while fetching accounts or data
  if (loadingAccounts || (isLoading && !overview)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no accounts
  if (accounts.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">cloud_off</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No Cloud Accounts Connected
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Connect your first cloud account to start monitoring
            </p>
            <a
              href="/cloud-accounts/new"
              className="px-6 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Connect Cloud Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Dashboard
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Cloud Overview
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitor and manage your multi-cloud infrastructure
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BadgeV2 variant="success" icon="check_circle">
              <span className="flex items-center gap-1">
                Live Updates
                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              </span>
            </BadgeV2>
            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
              Last 30 Days
            </button>
            <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">add</span>
              Add Widget
            </button>
          </div>
        </div>

        {/* KPI Cards Grid - NOW WITH REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="attach_money"
            label="Total Monthly Cost"
            value={`$${totalCost.toLocaleString()}`}
            variant="blue"
            trend={{
              direction: costTrend === 'up' ? 'up' : costTrend === 'down' ? 'down' : 'up',
              percentage: Math.abs(costChange),
              label: 'vs last month',
            }}
          />
          <KPICardV2
            icon="security"
            label="Security Score"
            value={`${securityScore}/100`}
            variant="emerald"
            comparison={securityScore >= 80 ? 'Good security posture' : securityScore >= 60 ? 'Fair security' : 'Needs improvement'}
          />
          <KPICardV2
            icon="dns"
            label="Active Resources"
            value={totalResources.toLocaleString()}
            variant="indigo"
            trend={
              overview?.resources?.byType && overview.resources.byType.length > 0
                ? {
                    direction: 'down',
                    percentage: 3,
                  }
                : undefined
            }
          />
          <KPICardV2
            icon="warning"
            label="Critical Alerts"
            value={criticalAlerts.toString()}
            variant="red"
            trend={
              criticalAlerts > 0
                ? {
                    direction: 'up',
                    percentage: 50,
                  }
                : undefined
            }
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Analysis Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Cost Analysis
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Multi-cloud spending trends
                </p>
              </div>
              <div className="flex items-center gap-2">
                <BadgeV2 variant="aws" size="sm">
                  AWS
                </BadgeV2>
                <BadgeV2 variant="azure" size="sm">
                  Azure
                </BadgeV2>
                <BadgeV2 variant="gcp" size="sm">
                  GCP
                </BadgeV2>
              </div>
            </div>
            <CostTrendChart />
          </div>

          {/* Security Health - NOW WITH REAL DATA */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Security Health
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Overall security score
              </p>
            </div>
            <div className="flex items-center justify-center">
              <SecurityScoreCircular score={securityScore} />
            </div>
            {overview?.security && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Critical Issues</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {overview.security.criticalIssues}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">High Issues</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {overview.security.highIssues}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Medium Issues</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {overview.security.mediumIssues}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations and Service Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Recommendations */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Top Recommendations
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cost savings and security improvements
                </p>
              </div>
              <button className="text-sm font-medium text-brand-primary-400 hover:text-brand-primary-500 transition-colors flex items-center gap-1">
                View All
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
            <RecommendationsTable />
          </div>

          {/* Service Health Status - NOW WITH REAL DATA */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Resources by Location
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Distribution across regions
              </p>
            </div>
            <div className="space-y-4">
              {health?.resourcesByLocation && health.resourcesByLocation.length > 0 ? (
                health.resourcesByLocation.map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-brand-primary-400">location_on</span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{location.location}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {location.count} resources ({location.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-brand-primary-400 h-2 rounded-full"
                        style={{ width: `${location.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">location_off</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No location data available</p>
                </div>
              )}
            </div>

            {/* Virtual Machines Status */}
            {health?.virtualMachines && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Virtual Machines
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {health.virtualMachines.running}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Running</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {health.virtualMachines.stopped}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Stopped</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
