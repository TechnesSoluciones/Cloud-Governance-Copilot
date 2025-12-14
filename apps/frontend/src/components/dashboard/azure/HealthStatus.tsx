'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { HealthStatus as HealthStatusType } from '@/lib/api/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface HealthStatusProps {
  health: HealthStatusType;
  className?: string;
}

/**
 * HealthStatus Component
 * Displays VM status with progress bars, resources by location bar chart, and health indicators
 * Implements responsive design and accessibility features
 */
export const HealthStatus: React.FC<HealthStatusProps> = ({ health, className = '' }) => {
  // Calculate VM percentages
  const vmPercentages = React.useMemo(() => {
    const total = health.virtualMachines.total;
    if (total === 0) return { running: 0, stopped: 0, deallocated: 0 };

    return {
      running: (health.virtualMachines.running / total) * 100,
      stopped: (health.virtualMachines.stopped / total) * 100,
      deallocated: (health.virtualMachines.deallocated / total) * 100,
    };
  }, [health.virtualMachines]);

  // Prepare data for locations bar chart
  const locationChartData = React.useMemo(() => {
    return health.resourcesByLocation.map((location) => ({
      location: location.location,
      count: location.count,
      percentage: location.percentage,
    }));
  }, [health.resourcesByLocation]);

  // Get health color based on percentage
  const getHealthColor = (percentage: number): string => {
    if (percentage >= 80) return '#10b981'; // green-500
    if (percentage >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  // Custom tooltip for bar chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md">
          <p className="text-sm font-semibold">{payload[0].payload.location}</p>
          <p className="text-xs text-muted-foreground">
            Count: {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Percentage: {payload[0].payload.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      {/* Virtual Machines Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Virtual Machines Status</CardTitle>
              <CardDescription>
                {health.virtualMachines.total} total VMs
              </CardDescription>
            </div>
            <Icons.server className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Running VMs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.checkCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span className="text-sm font-medium">Running</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  {health.virtualMachines.running}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {vmPercentages.running.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress
              value={health.virtualMachines.running}
              max={health.virtualMachines.total}
              variant="success"
              aria-label={`${health.virtualMachines.running} of ${health.virtualMachines.total} VMs running`}
            />
          </div>

          {/* Stopped VMs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.alertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span className="text-sm font-medium">Stopped</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">
                  {health.virtualMachines.stopped}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {vmPercentages.stopped.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress
              value={health.virtualMachines.stopped}
              max={health.virtualMachines.total}
              variant="warning"
              aria-label={`${health.virtualMachines.stopped} of ${health.virtualMachines.total} VMs stopped`}
            />
          </div>

          {/* Deallocated VMs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.xCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                <span className="text-sm font-medium">Deallocated</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="error">
                  {health.virtualMachines.deallocated}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {vmPercentages.deallocated.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress
              value={health.virtualMachines.deallocated}
              max={health.virtualMachines.total}
              variant="error"
              aria-label={`${health.virtualMachines.deallocated} of ${health.virtualMachines.total} VMs deallocated`}
            />
          </div>

          {/* Health Indicator */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getHealthColor(vmPercentages.running) }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold">
                  {vmPercentages.running >= 80 ? 'Healthy' : vmPercentages.running >= 50 ? 'Warning' : 'Critical'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources by Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Resources by Location</CardTitle>
              <CardDescription>Distribution across regions</CardDescription>
            </div>
            <Icons.mapPin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]" role="img" aria-label="Bar chart showing resources distribution by location">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={locationChartData}
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
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {locationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHealthColor(entry.percentage)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Locations</p>
                <p className="text-lg font-semibold">{locationChartData.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Primary Location</p>
                <p className="text-sm font-medium truncate" title={locationChartData[0]?.location}>
                  {locationChartData[0]?.location || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
