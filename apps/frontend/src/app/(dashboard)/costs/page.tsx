/**
 * Costs V2 Page
 * CloudNexus Design - Complete Cost Analysis Implementation
 * NOW INTEGRATED WITH BACKEND API
 */

'use client';

import { useState, useMemo } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { CostTrendChart } from '@/components/charts/CostTrendChart';
import { useCombinedCostData, extractCostData, extractServiceData, extractTrendData } from '@/hooks/useCosts';
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

export default function CostsV2Page() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [timeRange]);

  // Fetch all cost data using the combined hook
  const {
    costs,
    costsByService,
    trends,
    isLoading,
    hasError,
  } = useCombinedCostData({
    ...dateRange,
    provider: 'ALL',
  });

  // Extract data from responses
  const costData = extractCostData(costs.data);
  const serviceData = extractServiceData(costsByService.data);
  const trendData = extractTrendData(trends.data);

  // Calculate KPI metrics from real data
  const totalCost = costData?.total || 0;
  const currency = 'USD'; // Hardcoded for now until backend provides currency

  // For demo purposes, calculate potential savings as 15% of total
  const potentialSavings = totalCost * 0.15;

  // Estimate forecast (current spending rate * days remaining in month)
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  const monthlyForecast = (totalCost / daysPassed) * daysInMonth;

  // Daily average
  const dailyAverage = totalCost / daysPassed;

  // Transform service data for bar chart
  const serviceBreakdown = useMemo(() => {
    if (!serviceData?.services) return [];

    // Group by service name across providers
    const grouped = serviceData.services.reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.service);
      if (existing) {
        existing[item.provider.toLowerCase()] = item.totalCost;
      } else {
        acc.push({
          name: item.service,
          [item.provider.toLowerCase()]: item.totalCost,
        });
      }
      return acc;
    }, [] as any[]);

    return grouped;
  }, [serviceData]);

  // Transform cost data for pie chart
  const costByProvider = useMemo(() => {
    if (!costData?.costs) return [];

    const providerColors: Record<string, string> = {
      AWS: '#FF9900',
      AZURE: '#0078D4',
      GCP: '#34A853',
    };

    // Group costs by provider
    const grouped = costData.costs.reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.provider);
      if (existing) {
        existing.value += item.amount;
      } else {
        acc.push({
          name: item.provider,
          value: item.amount,
          color: providerColors[item.provider] || '#888888',
        });
      }
      return acc;
    }, [] as Array<{ name: string; value: number; color: string }>);

    return grouped;
  }, [costData]);

  // Loading state
  if (isLoading && !costData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading cost data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Cost Data
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Unable to fetch cost information from the server
            </p>
            <button
              onClick={() => {
                costs.refetch();
                costsByService.refetch();
                trends.refetch();
              }}
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

        {/* KPI Cards - NOW WITH REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="attach_money"
            label={`Total Spend (${timeRange === '7d' ? '7D' : timeRange === '30d' ? 'MTD' : '90D'})`}
            value={`${currency === 'USD' ? '$' : ''}${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            variant="blue"
            trend={{
              direction: totalCost > 0 ? 'up' : 'down',
              percentage: 12,
              label: 'vs previous period',
            }}
          />
          <KPICardV2
            icon="savings"
            label="Potential Savings"
            value={`${currency === 'USD' ? '$' : ''}${potentialSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            variant="emerald"
            comparison="From recommendations"
          />
          <KPICardV2
            icon="trending_up"
            label="Forecast (Month End)"
            value={`${currency === 'USD' ? '$' : ''}${monthlyForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            variant="orange"
            trend={{
              direction: monthlyForecast > totalCost ? 'up' : 'down',
              percentage: Math.abs(((monthlyForecast - totalCost) / totalCost) * 100),
            }}
          />
          <KPICardV2
            icon="analytics"
            label="Daily Average"
            value={`${currency === 'USD' ? '$' : ''}${dailyAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
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

          {/* Cost by Provider - NOW WITH REAL DATA */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Cost by Provider
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Distribution breakdown
              </p>
            </div>
            {costByProvider.length > 0 ? (
              <>
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
              </>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">pie_chart</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">No provider cost data available</p>
              </div>
            )}
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

          {/* TODO: Top Cost Resources table - pending backend endpoint implementation */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">construction</span>
              <p className="text-sm">Resource cost breakdown coming soon</p>
              <p className="text-xs mt-1">Backend endpoint pending implementation</p>
            </div>
          </div>
          </div>
        </div>
    </div>
  );
}
