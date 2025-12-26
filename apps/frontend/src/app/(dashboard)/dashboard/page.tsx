/**
 * Dashboard V2 Page
 * CloudNexus Design - Complete Dashboard Implementation
 *
 * NOTE: Layout is provided by DashboardLayoutWrapper (in layout.tsx)
 * This page only renders the content, not the layout structure
 */

'use client';

import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import { SecurityScoreCircular } from '@/components/charts/SecurityScoreCircular';
import { RecommendationsTable } from '@/components/dashboard/RecommendationsTable';

export default function DashboardV2Page() {
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

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="attach_money"
            label="Total Monthly Cost"
            value="$12,450"
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 12,
              label: 'vs last month',
            }}
          />
          <KPICardV2
            icon="security"
            label="Security Score"
            value="85/100"
            variant="emerald"
            comparison="Good security posture"
          />
          <KPICardV2
            icon="dns"
            label="Active Resources"
            value="1,240"
            variant="indigo"
            trend={{
              direction: 'down',
              percentage: 3,
            }}
          />
          <KPICardV2
            icon="warning"
            label="Critical Alerts"
            value="3"
            variant="red"
            trend={{
              direction: 'up',
              percentage: 50,
            }}
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

          {/* Security Health */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Security Health
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Overall security score
              </p>
            </div>
            <div className="flex items-center justify-center">
              <SecurityScoreCircular score={85} />
            </div>
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

          {/* Service Health Status */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Service Health
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Regional status
              </p>
            </div>
            <div className="space-y-4">
              <StatusIndicatorV2
                status="operational"
                label="AWS US-East-1"
                details="All services operational"
                icon="cloud_done"
              />
              <StatusIndicatorV2
                status="operational"
                label="Azure West Europe"
                details="All services operational"
                icon="cloud_done"
              />
              <StatusIndicatorV2
                status="warning"
                label="GCP Asia-East"
                details="High traffic detected"
                icon="cloud_sync"
              />
              <StatusIndicatorV2
                status="operational"
                label="AWS EU-Central"
                details="All services operational"
                icon="cloud_done"
              />
            </div>
          </div>
        </div>
    </div>
  );
}
