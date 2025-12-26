/**
 * Costs V2 Page
 * CloudNexus Design - Complete Cost Analysis Implementation
 */

'use client';

import { useState } from 'react';
import { DashboardLayoutV2 } from '@/components/layout/DashboardLayoutV2';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const serviceBreakdown = [
  { name: 'EC2 Instances', aws: 2800, azure: 1200, gcp: 800 },
  { name: 'Storage', aws: 600, azure: 900, gcp: 400 },
  { name: 'Networking', aws: 400, azure: 500, gcp: 300 },
  { name: 'Database', aws: 800, azure: 600, gcp: 500 },
  { name: 'Other', aws: 600, azure: 800, gcp: 500 },
];

const costByProvider = [
  { name: 'AWS', value: 4800, color: '#FF9900' },
  { name: 'Azure', value: 3600, color: '#0078D4' },
  { name: 'GCP', value: 2500, color: '#34A853' },
];

const topCostResources = [
  {
    id: '1',
    name: 'prod-web-cluster',
    type: 'EC2 Instance',
    provider: 'AWS',
    region: 'us-east-1',
    cost: '$1,245',
    trend: 8,
    utilizaton: 78,
  },
  {
    id: '2',
    name: 'db-primary',
    type: 'RDS MySQL',
    provider: 'AWS',
    region: 'us-west-2',
    cost: '$892',
    trend: -3,
    utilizaton: 92,
  },
  {
    id: '3',
    name: 'storage-prod-data',
    type: 'Storage Account',
    provider: 'Azure',
    region: 'westeurope',
    cost: '$756',
    trend: 15,
    utilizaton: 45,
  },
  {
    id: '4',
    name: 'app-service-api',
    type: 'App Service',
    provider: 'Azure',
    region: 'eastus',
    cost: '$624',
    trend: 5,
    utilizaton: 65,
  },
  {
    id: '5',
    name: 'gke-cluster-prod',
    type: 'GKE Cluster',
    provider: 'GCP',
    region: 'us-central1',
    cost: '$580',
    trend: -2,
    utilizaton: 88,
  },
];

export default function CostsV2Page() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <DashboardLayoutV2>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Cost Analysis
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track and optimize your multi-cloud spending
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
            <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">download</span>
              Export Report
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="attach_money"
            label="Total Spend (MTD)"
            value="$10,900"
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 12,
              label: 'vs last month',
            }}
          />
          <KPICardV2
            icon="savings"
            label="Potential Savings"
            value="$1,850"
            variant="emerald"
            comparison="From recommendations"
          />
          <KPICardV2
            icon="trending_up"
            label="Forecast (Month End)"
            value="$12,450"
            variant="orange"
            trend={{
              direction: 'up',
              percentage: 8,
            }}
          />
          <KPICardV2
            icon="analytics"
            label="Daily Average"
            value="$415"
            variant="indigo"
            trend={{
              direction: 'down',
              percentage: 3,
            }}
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Trend */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Cost Trend
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Daily spending across all providers
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

          {/* Cost by Provider */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Cost by Provider
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Distribution breakdown
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={costByProvider}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {costByProvider.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {costByProvider.map((provider) => (
                <div key={provider.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: provider.color }}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {provider.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    ${provider.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Service Breakdown
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Costs by service category
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceBreakdown} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="name"
                className="text-xs text-slate-600 dark:text-slate-400"
                stroke="currentColor"
              />
              <YAxis
                className="text-xs text-slate-600 dark:text-slate-400"
                stroke="currentColor"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="aws" fill="#FF9900" name="AWS" />
              <Bar dataKey="azure" fill="#0078D4" name="Azure" />
              <Bar dataKey="gcp" fill="#34A853" name="GCP" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cost Resources */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Top Cost Resources
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Highest spending resources this month
              </p>
            </div>
            <button className="text-sm font-medium text-brand-primary-400 hover:text-brand-primary-500 transition-colors flex items-center gap-1">
              View All
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Cost (MTD)
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCostResources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <BadgeV2
                          variant={resource.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                          size="sm"
                        >
                          {resource.provider}
                        </BadgeV2>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {resource.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {resource.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {resource.region}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {resource.cost}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span
                          className={`material-symbols-outlined text-lg ${
                            resource.trend > 0 ? 'text-error' : 'text-success'
                          }`}
                        >
                          {resource.trend > 0 ? 'trending_up' : 'trending_down'}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            resource.trend > 0 ? 'text-error' : 'text-success'
                          }`}
                        >
                          {Math.abs(resource.trend)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 max-w-[80px]">
                          <div
                            className="bg-brand-primary-400 h-2 rounded-full"
                            style={{ width: `${resource.utilizaton}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[40px]">
                          {resource.utilizaton}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayoutV2>
  );
}
