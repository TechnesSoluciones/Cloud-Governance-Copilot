'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { DashboardOverview } from '@/lib/api/dashboard';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ResourceDistributionProps {
  overview: DashboardOverview;
  className?: string;
}

// Color palette for charts - accessible and visually distinct
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

/**
 * ResourceDistribution Component
 * Displays pie chart for resources by type and bar chart for resources by location
 * Uses Recharts library with responsive containers
 * Implements accessibility best practices for data visualization
 */
export const ResourceDistribution: React.FC<ResourceDistributionProps> = ({
  overview,
  className = '',
}) => {
  // Prepare data for resources by type (top 5)
  const resourcesByTypeData = React.useMemo(() => {
    const topTypes = overview.resources.byType
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalTop = topTypes.reduce((sum, item) => sum + item.count, 0);
    const othersCount = overview.resources.total - totalTop;

    const data = topTypes.map((item) => ({
      name: item.type,
      value: item.count,
      percentage: ((item.count / overview.resources.total) * 100).toFixed(1),
    }));

    if (othersCount > 0) {
      data.push({
        name: 'Others',
        value: othersCount,
        percentage: ((othersCount / overview.resources.total) * 100).toFixed(1),
      });
    }

    return data;
  }, [overview.resources.byType, overview.resources.total]);

  // Prepare data for resources by location (top 5)
  const resourcesByLocationData = React.useMemo(() => {
    return overview.resources.byLocation
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        location: item.location,
        count: item.count,
        percentage: ((item.count / overview.resources.total) * 100).toFixed(1),
      }));
  }, [overview.resources.byLocation, overview.resources.total]);

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="text-sm font-semibold">{payload[0].name}</p>
          <p className="text-xs text-muted-foreground">
            Count: {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Percentage: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="text-sm font-semibold">{payload[0].payload.location}</p>
          <p className="text-xs text-muted-foreground">
            Count: {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Percentage: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      {/* Resources by Type - Pie Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Resources by Type</CardTitle>
              <CardDescription>Top 5 resource types</CardDescription>
            </div>
            <Icons.pieChart className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]" role="img" aria-label="Pie chart showing distribution of resources by type">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourcesByTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resourcesByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {resourcesByTypeData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources by Location - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Resources by Location</CardTitle>
              <CardDescription>Top 5 Azure regions</CardDescription>
            </div>
            <Icons.barChart className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]" role="img" aria-label="Bar chart showing distribution of resources by location">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={resourcesByLocationData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="location"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
