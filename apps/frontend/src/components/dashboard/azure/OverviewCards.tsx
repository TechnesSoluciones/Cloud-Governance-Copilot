'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { DashboardOverview } from '@/lib/api/dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface OverviewCardsProps {
  overview: DashboardOverview;
  className?: string;
}

/**
 * OverviewCards Component
 * Displays 4 KPI cards for Total Resources, Current Month Costs, Security Score, and Active Alerts
 * Implements responsive grid layout with hover effects
 * Includes accessibility features and keyboard navigation
 */
export const OverviewCards: React.FC<OverviewCardsProps> = ({ overview, className = '' }) => {
  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-red-600 dark:text-red-400';
    if (trend === 'down') return 'text-green-600 dark:text-green-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <Icons.trendingUp className="h-4 w-4" aria-hidden="true" />;
    if (trend === 'down') return <Icons.trendingDown className="h-4 w-4" aria-hidden="true" />;
    return <span className="h-4 w-4 inline-block">-</span>;
  };

  const getSecurityScoreVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSeverityBadgeVariant = (
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): 'error' | 'warning' | 'info' => {
    if (severity === 'critical' || severity === 'high') return 'error';
    if (severity === 'medium') return 'warning';
    return 'info';
  };

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {/* Total Resources Card */}
      <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Resources
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="View resource breakdown"
              >
                <Icons.info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs font-semibold">By Type (Top 5)</div>
              {overview.resources.byType.slice(0, 5).map((resource) => (
                <DropdownMenuItem key={resource.type} className="flex justify-between">
                  <span className="text-xs">{resource.type}</span>
                  <Badge variant="secondary" className="ml-2">
                    {resource.count}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.resources.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {overview.resources.byLocation.length} location
            {overview.resources.byLocation.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Current Month Costs Card */}
      <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Month Costs
          </CardTitle>
          <Icons.dollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${overview.costs.currentMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 ${getTrendColor(overview.costs.trend)}`}
              aria-label={`${overview.costs.trend === 'up' ? 'Increased' : overview.costs.trend === 'down' ? 'Decreased' : 'No change'} by ${Math.abs(overview.costs.percentageChange)}%`}
            >
              {getTrendIcon(overview.costs.trend)}
              {Math.abs(overview.costs.percentageChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Security Score Card */}
      <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Security Score
          </CardTitle>
          <Icons.shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSecurityScoreColor(overview.security.score)}`}>
            {overview.security.score}/100
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {overview.security.criticalIssues > 0 && (
                <Badge variant="error" className="mr-1">
                  {overview.security.criticalIssues} Critical
                </Badge>
              )}
              {overview.security.highIssues > 0 && (
                <Badge variant="warning" className="mr-1">
                  {overview.security.highIssues} High
                </Badge>
              )}
              {overview.security.mediumIssues > 0 && (
                <Badge variant="info">
                  {overview.security.mediumIssues} Medium
                </Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts Card */}
      <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Alerts
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="View recent alerts"
              >
                <Icons.bell className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-xs font-semibold">Recent Alerts</div>
              {overview.alerts.recent.length > 0 ? (
                overview.alerts.recent.slice(0, 5).map((alert) => (
                  <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 py-2">
                    <div className="flex w-full items-center justify-between">
                      <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs">{alert.message}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No recent alerts
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.alerts.active}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.alerts.recent.length} in last 24 hours
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
