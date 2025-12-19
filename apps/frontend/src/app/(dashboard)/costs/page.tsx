'use client';

/**
 * Cost Analysis Page
 *
 * Comprehensive cost analysis dashboard for cloud cost management.
 * Features:
 * - Interactive date range selector with presets
 * - Cost overview cards with KPIs and trends
 * - Visual cost trend charts with forecasting
 * - Service breakdown with pie/bar charts and table views
 * - Export functionality for reports
 * - Real-time data refresh
 * - Responsive design with loading/error/empty states
 * - Full accessibility support
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { subDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Provider } from '@/lib/api/finops';
import { useCombinedCostData } from '@/hooks/useCosts';
import { CostOverviewCards, BudgetAlert } from '@/components/costs/CostOverviewCards';
import { CostTrendChart } from '@/components/costs/CostTrendChart';
import { ServiceBreakdown } from '@/components/costs/ServiceBreakdown';
import { DateRangeSelector } from '@/components/costs/DateRangeSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Download,
  FileText,
  AlertCircle,
  TrendingUp,
  Filter,
  DollarSign,
  TrendingDown,
  Activity,
} from 'lucide-react';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_BACKGROUNDS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS
} from '@/components/shared/premium';
import {
  formatCurrency,
  calculateTrend,
  calculatePercentageChange,
  forecastCost,
  exportToCSV,
  generateForecast,
} from '@/lib/costs';
import { ServiceData } from '@/components/costs/ServiceBreakdown';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { StatCardGridSkeleton, ChartSkeleton, CardSkeleton } from '@/components/skeletons';

/**
 * Provider filter options
 */
const PROVIDER_OPTIONS = [
  { value: 'ALL', label: 'All Providers' },
  { value: 'AWS', label: 'AWS' },
  { value: 'AZURE', label: 'Azure' },
] as const;

/**
 * Loading skeleton for the entire page
 */
function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full lg:w-64" />
      </div>

      {/* KPI Cards */}
      <StatCardGridSkeleton count={4} />

      {/* Cost Trend Chart */}
      <ChartSkeleton type="line" height="lg" showLegend showControls />

      {/* Service Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <ChartSkeleton type="pie" height="md" showLegend={false} />
      </div>

      {/* Insights Card */}
      <CardSkeleton variant="default" rows={4} />
    </div>
  );
}

/**
 * Error state component
 */
interface ErrorStateProps {
  error: any;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-red-200">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Load Cost Data
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {error?.message || 'An unexpected error occurred while fetching cost data. Please try again.'}
            </p>
            <Button onClick={onRetry} className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Cost Data Available
            </h3>
            <p className="text-sm text-gray-600">
              There is no cost data available for the selected period. Try selecting a different date range or provider.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Cost Analysis Page Component (wrapped in ErrorBoundary)
 */
function CostsPageContent() {
  // Date range state (default: current month to date)
  const [dateRange, setDateRange] = useState(() => ({
    start: startOfMonth(new Date()),
    end: new Date(),
  }));

  // Provider filter state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('ALL');

  // View mode for service breakdown
  const [serviceViewMode, setServiceViewMode] = useState<'chart' | 'table'>('chart');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Toast notifications
  const { addToast } = useToast();

  // Convert date range to API format (YYYY-MM-DD)
  const apiDateRange = useMemo(
    () => ({
      startDate: format(dateRange.start, 'yyyy-MM-dd'),
      endDate: format(dateRange.end, 'yyyy-MM-dd'),
    }),
    [dateRange]
  );

  // Fetch all cost data using combined hook
  const {
    costs,
    costsByService,
    trends,
    anomalies,
    isLoading,
    hasError,
  } = useCombinedCostData({
    ...apiDateRange,
    provider: selectedProvider,
  });

  // Extract data from API responses
  const costsData = costs.data?.success ? costs.data.data : null;
  const serviceData = costsByService.data?.success ? costsByService.data.data : null;
  const trendsData = trends.data?.success ? trends.data.data : null;
  const anomaliesData = anomalies.data?.success ? anomalies.data.data : null;

  // Calculate previous month data for comparison
  const previousMonthRange = useMemo(() => {
    const prevMonth = subMonths(dateRange.start, 1);
    return {
      startDate: format(startOfMonth(prevMonth), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(prevMonth), 'yyyy-MM-dd'),
    };
  }, [dateRange.start]);

  // Fetch previous month data
  const { costs: previousCosts } = useCombinedCostData({
    ...previousMonthRange,
    provider: selectedProvider,
  });

  const previousCostsData = previousCosts.data?.success ? previousCosts.data.data : null;

  // Calculate KPIs
  const currentMonthCost = costsData?.summary?.totalCost || 0;
  const previousMonthCost = previousCostsData?.summary?.totalCost || 0;
  const currency = costsData?.summary?.currency || 'USD';

  const trend = calculateTrend(currentMonthCost, previousMonthCost);
  const percentageChange = calculatePercentageChange(currentMonthCost, previousMonthCost);

  // Calculate forecast with proper validation
  const forecast = useMemo(() => {
    if (!trendsData?.trends || !Array.isArray(trendsData.trends) || trendsData.trends.length === 0) {
      return currentMonthCost * 1.1;
    }

    const daysInMonth = new Date(
      dateRange.start.getFullYear(),
      dateRange.start.getMonth() + 1,
      0
    ).getDate();

    // Filter and validate trend data before passing to forecastCost
    const validTrends = trendsData.trends
      .filter(t => t && t.date && typeof t.total === 'number')
      .map(t => ({ date: t.date, cost: t.total }));

    if (validTrends.length === 0) {
      return currentMonthCost * 1.1;
    }

    return forecastCost(validTrends, daysInMonth);
  }, [trendsData, currentMonthCost, dateRange.start]);

  // Get top service with proper null/undefined/empty checks
  const topService = serviceData?.services && serviceData.services.length > 0
    ? serviceData.services[0].service
    : 'N/A';
  const topServiceCost = serviceData?.services && serviceData.services.length > 0
    ? serviceData.services[0].totalCost
    : 0;

  // Convert service data for component with proper validation
  const serviceBreakdownData: ServiceData[] = useMemo(
    () => {
      if (!serviceData?.services || !Array.isArray(serviceData.services) || serviceData.services.length === 0) {
        return [];
      }

      return serviceData.services.map((s) => ({
        service: s.service || 'Unknown',
        cost: s.totalCost || 0,
        percentage: s.percentage || 0,
        provider: (s.provider || 'AWS') as 'AWS' | 'Azure',
        currency: s.currency || 'USD',
      }));
    },
    [serviceData]
  );

  // Generate forecast data for chart with proper validation
  const forecastData = useMemo(() => {
    if (!trendsData?.trends || !Array.isArray(trendsData.trends) || trendsData.trends.length < 2) {
      return [];
    }

    // Validate that trends have required fields
    const validTrends = trendsData.trends.filter(t => t && t.date && typeof t.total === 'number');
    if (validTrends.length < 2) {
      return [];
    }

    return generateForecast(validTrends, 7);
  }, [trendsData]);

  // Handle refresh
  const handleRefresh = () => {
    costs.refetch();
    costsByService.refetch();
    trends.refetch();
    anomalies.refetch();
  };

  // Handle export to CSV
  const handleExportCosts = () => {
    if (!trendsData?.trends || !Array.isArray(trendsData.trends) || trendsData.trends.length === 0) {
      addToast('No cost data available to export', 'warning');
      return;
    }

    const exportData = trendsData.trends
      .filter(t => t && t.date)
      .map((t) => ({
        Date: t.date,
        AWS: t.aws || 0,
        Azure: t.azure || 0,
        Total: t.total || 0,
        Currency: t.currency || currency,
      }));

    if (exportData.length === 0) {
      addToast('No valid cost data to export', 'warning');
      return;
    }

    exportToCSV(exportData, `cost-analysis-${apiDateRange.startDate}-to-${apiDateRange.endDate}`);
    addToast('Cost data exported successfully', 'success');
  };

  // Handle generate report (placeholder for PDF generation)
  const handleGenerateReport = () => {
    // TODO: Implement PDF report generation
    addToast('PDF report generation will be implemented soon!', 'info');
  };

  // Show loading state
  if (isLoading && !costsData) {
    return <PageLoadingSkeleton />;
  }

  // Show error state
  if (hasError && !costsData) {
    return <ErrorState error={costs.error} onRetry={handleRefresh} />;
  }

  // Show empty state
  if (!costsData || currentMonthCost === 0) {
    return <EmptyState />;
  }

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Cost Analysis"
          subtitle="Monitor and optimize your cloud spending across all providers"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                aria-label="Refresh cost data"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCosts}
                aria-label="Export cost data to CSV"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                className="shadow-lg"
                aria-label="Generate cost report"
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                Generate Report
              </Button>
            </>
          }
        />

      {/* Filters Section */}
      <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
        {/* Date Range Selector */}
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          maxDate={new Date()}
        />

        {/* Provider Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-900">Provider</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {PROVIDER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedProvider === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedProvider(option.value as Provider)}
                    aria-pressed={selectedProvider === option.value}
                    aria-label={`Filter by ${option.label}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      {anomaliesData && anomaliesData.anomalies.length > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-900">
                  Cost Anomalies Detected
                </h3>
                <p className="text-sm text-amber-800 mt-1">
                  {anomaliesData.summary.high > 0 && (
                    <span className="font-medium">
                      {anomaliesData.summary.high} high severity
                    </span>
                  )}
                  {anomaliesData.summary.high > 0 && anomaliesData.summary.medium > 0 && ', '}
                  {anomaliesData.summary.medium > 0 && (
                    <span className="font-medium">
                      {anomaliesData.summary.medium} medium severity
                    </span>
                  )}
                  {' '}anomalies detected in your spending patterns.
                </p>
                <div className="mt-3 space-y-2">
                  {anomaliesData.anomalies.slice(0, 2).map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="text-sm bg-white rounded-md p-3 border border-amber-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-gray-900 truncate">
                            {anomaly.service}
                          </span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {anomaly.provider}
                          </Badge>
                        </div>
                        <Badge
                          variant={
                            anomaly.severity === 'high'
                              ? 'error'
                              : anomaly.severity === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-xs flex-shrink-0"
                        >
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-gray-600">
                        {anomaly.deviationPercentage > 0 ? '+' : ''}
                        {anomaly.deviationPercentage.toFixed(1)}% deviation on{' '}
                        {format(new Date(anomaly.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Stats Bar - Cost KPIs */}
      <PremiumStatsBar
        stats={[
          {
            label: 'Current Month',
            value: formatCurrency(currentMonthCost, currency),
            icon: <DollarSign className="h-14 w-14" />,
            iconBg: PREMIUM_GRADIENTS.warning,
            iconColor: PREMIUM_ICON_COLORS.warning,
            trend: {
              value: Math.abs(percentageChange),
              direction: trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'stable',
            },
            subtitle: 'vs last month',
          },
          {
            label: 'Previous Month',
            value: formatCurrency(previousMonthCost, currency),
            icon: <TrendingDown className="h-14 w-14" />,
            iconBg: PREMIUM_GRADIENTS.info,
            iconColor: PREMIUM_ICON_COLORS.info,
            subtitle: format(subMonths(dateRange.start, 1), 'MMMM yyyy'),
          },
          {
            label: 'Forecast',
            value: formatCurrency(forecast, currency),
            icon: <TrendingUp className="h-14 w-14" />,
            iconBg: PREMIUM_GRADIENTS.success,
            iconColor: PREMIUM_ICON_COLORS.success,
            subtitle: 'Projected end of month',
          },
          {
            label: 'Top Service',
            value: formatCurrency(topServiceCost, currency),
            icon: <Activity className="h-14 w-14" />,
            iconBg: PREMIUM_GRADIENTS.azure,
            iconColor: PREMIUM_ICON_COLORS.azure,
            subtitle: topService || 'N/A',
          },
        ]}
      />

      {/* Cost Trend Chart */}
      <CostTrendChart
        dailyCosts={
          trendsData?.trends && Array.isArray(trendsData.trends)
            ? trendsData.trends
                .filter(t => t && t.date && typeof t.total === 'number')
                .map((t) => ({
                  date: t.date,
                  cost: t.total || 0,
                  aws: t.aws || 0,
                  azure: t.azure || 0,
                  total: t.total || 0,
                }))
            : []
        }
        forecast={forecastData}
        currency={currency}
        isLoading={trends.isLoading}
        showProviderBreakdown={selectedProvider === 'ALL'}
      />

      {/* Service Breakdown */}
      <ServiceBreakdown
        services={serviceBreakdownData}
        viewMode={serviceViewMode}
        onViewModeChange={setServiceViewMode}
        currency={currency}
        isLoading={costsByService.isLoading}
        chartType={chartType}
        onChartTypeChange={setChartType}
      />

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Insights</CardTitle>
          <CardDescription>
            Key findings and recommendations based on your spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trend === 'up' && percentageChange > 10 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <TrendingUp className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Significant Cost Increase
                  </p>
                  <p className="text-sm text-red-800 mt-1">
                    Your costs have increased by {percentageChange.toFixed(1)}% compared to last month.
                    Review your top services to identify opportunities for optimization.
                  </p>
                </div>
              </div>
            )}

            {serviceBreakdownData.length > 0 &&
             serviceBreakdownData[0] &&
             typeof serviceBreakdownData[0].percentage === 'number' &&
             serviceBreakdownData[0].percentage > 50 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Concentrated Spending
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {serviceBreakdownData[0].service || 'Unknown service'} accounts for{' '}
                    {serviceBreakdownData[0].percentage.toFixed(1)}% of your total costs.
                    Consider implementing cost controls or reserved instances for this service.
                  </p>
                </div>
              </div>
            )}

            {forecast > currentMonthCost * 1.2 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    High Forecasted Spend
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    Your forecasted month-end spending is {formatCurrency(forecast, currency)},
                    which is {((forecast / currentMonthCost - 1) * 100).toFixed(0)}% higher than current spend.
                    Monitor your usage closely.
                  </p>
                </div>
              </div>
            )}

            {serviceBreakdownData.length === 0 && (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                No insights available for the selected period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

/**
 * Exported page component wrapped in ErrorBoundary
 */
export default function CostsPage() {
  return (
    <ErrorBoundary>
      <CostsPageContent />
    </ErrorBoundary>
  );
}
