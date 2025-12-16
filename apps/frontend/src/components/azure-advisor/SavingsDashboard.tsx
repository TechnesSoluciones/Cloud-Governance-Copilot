/**
 * SavingsDashboard Component
 *
 * Displays potential savings dashboard with charts and analytics.
 *
 * Features:
 * - Total savings card with trend
 * - Savings by category (Pie chart)
 * - Top 10 opportunities list
 * - Savings trend over time (Line chart)
 * - Interactive ROI calculator
 * - Responsive layout
 */

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  DollarSign,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PotentialSavingsDashboardDTO,
  CategorySavingsBreakdown,
  formatCurrency,
  CATEGORY_COLORS,
} from '@/types/azure-advisor';
import { CategoryBadge, ImpactBadge } from './CategoryBadge';

export interface SavingsDashboardProps {
  data: PotentialSavingsDashboardDTO | undefined | null;
  isLoading?: boolean;
}

/**
 * Category Color Mapping for Charts
 */
const CHART_COLORS: Record<string, string> = {
  Cost: '#10b981', // green-500
  Security: '#ef4444', // red-500
  Reliability: '#3b82f6', // blue-500
  Performance: '#eab308', // yellow-500
  OperationalExcellence: '#a855f7', // purple-500
};

/**
 * Total Savings Card
 */
function TotalSavingsCard({
  totalSavings,
  currency,
}: {
  totalSavings: number;
  currency: string;
}) {
  // Mock trend (in a real app, calculate from historical data)
  const trend = 12.5;

  return (
    <Card className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-green-900">
          Total Potential Savings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold text-green-700">
              {formatCurrency(totalSavings, currency)}
            </div>
            <p className="text-sm text-green-600 mt-2">Monthly potential savings</p>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                +{trend}% from last month
              </span>
            </div>
          </div>
          <div className="p-6 bg-green-200 rounded-full">
            <DollarSign className="h-12 w-12 text-green-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Savings by Category Pie Chart
 */
function SavingsByCategoryChart({
  data,
  currency,
}: {
  data: CategorySavingsBreakdown[];
  currency: string;
}) {
  const chartData = data.map((item) => ({
    name: item.category,
    value: item.totalSavings,
    count: item.count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <CategoryBadge category={data.name} showIcon size="sm" />
          <p className="text-sm font-semibold text-gray-900 mt-2">
            {formatCurrency(data.value, currency)}
          </p>
          <p className="text-xs text-gray-600">{data.count} recommendations</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Savings by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[entry.name] || '#94a3b8'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item) => (
            <div
              key={item.category}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[item.category] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {item.category}
                </p>
                <p className="text-xs text-gray-600">
                  {formatCurrency(item.totalSavings, 'USD')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Top Opportunities List
 */
function TopOpportunitiesList({
  opportunities,
  currency,
}: {
  opportunities: Array<{
    id: string;
    description: string;
    category: string;
    impact: string;
    savings: number;
    resourceName?: string;
  }>;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Top 10 Savings Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {opportunities.slice(0, 10).map((opportunity, index) => (
            <div
              key={opportunity.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {opportunity.description}
                </p>
                {opportunity.resourceName && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {opportunity.resourceName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <CategoryBadge
                    category={opportunity.category as any}
                    size="sm"
                  />
                  <ImpactBadge impact={opportunity.impact as any} size="sm" />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(opportunity.savings, currency)}
                </p>
                <p className="text-xs text-gray-500">potential</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Savings Trend Chart
 */
function SavingsTrendChart({
  data,
  currency,
}: {
  data: Array<{
    date: string;
    totalSavings: number;
    newRecommendations: number;
    resolvedRecommendations: number;
  }>;
  currency: string;
}) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    savings: item.totalSavings,
    new: item.newRecommendations,
    resolved: item.resolvedRecommendations,
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Savings Trend (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'savings') {
                  return [formatCurrency(value, currency), 'Total Savings'];
                }
                return [value, name === 'new' ? 'New Recs' : 'Resolved'];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 4 }}
              name="Total Savings"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * ROI Calculator
 */
function ROICalculator({ totalSavings, currency }: { totalSavings: number; currency: string }) {
  const [implementationCost, setImplementationCost] = React.useState<number>(5000);
  const [monthsToImplement, setMonthsToImplement] = React.useState<number>(3);

  const monthlySavings = totalSavings;
  const yearlySavings = monthlySavings * 12;
  const breakEvenMonths = Math.ceil(implementationCost / monthlySavings);
  const roi = ((yearlySavings - implementationCost) / implementationCost) * 100;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="implementation-cost">
                Estimated Implementation Cost
              </Label>
              <Input
                id="implementation-cost"
                type="number"
                value={implementationCost}
                onChange={(e) => setImplementationCost(Number(e.target.value))}
                min={0}
                step={1000}
              />
            </div>
            <div>
              <Label htmlFor="months-to-implement">
                Months to Implement
              </Label>
              <Input
                id="months-to-implement"
                type="number"
                value={monthsToImplement}
                onChange={(e) => setMonthsToImplement(Number(e.target.value))}
                min={1}
                max={24}
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                Annual Savings
              </p>
              <p className="text-3xl font-bold text-green-800 mt-1">
                {formatCurrency(yearlySavings, currency)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                Break-Even Period
              </p>
              <p className="text-3xl font-bold text-blue-800 mt-1">
                {breakEvenMonths} months
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">
                12-Month ROI
              </p>
              <p className="text-3xl font-bold text-purple-800 mt-1">
                {roi.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Skeleton
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Main SavingsDashboard Component
 */
export function SavingsDashboard({ data, isLoading }: SavingsDashboardProps) {
  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const {
    totalPotentialSavings,
    currency,
    savingsByCategory,
    topOpportunities,
    savingsTrend,
  } = data;

  return (
    <div className="space-y-6">
      {/* Total Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TotalSavingsCard totalSavings={totalPotentialSavings} currency={currency} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SavingsByCategoryChart data={savingsByCategory} currency={currency} />
        <TopOpportunitiesList opportunities={topOpportunities} currency={currency} />
      </div>

      {/* Trend Chart */}
      <SavingsTrendChart data={savingsTrend} currency={currency} />

      {/* ROI Calculator */}
      <ROICalculator totalSavings={totalPotentialSavings} currency={currency} />
    </div>
  );
}
