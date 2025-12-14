/**
 * Cost Data Types
 *
 * Type definitions for cost-related components in the Cloud Copilot platform.
 */

export interface CostTrend {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** AWS costs for this date */
  aws: number;
  /** Azure costs for this date */
  azure: number;
  /** Total combined costs */
  total: number;
}

export interface CostByService {
  /** Service name (e.g., "EC2", "S3", "Virtual Machines") */
  service: string;
  /** Cloud provider (AWS or Azure) */
  provider: 'AWS' | 'Azure';
  /** Total cost for this service */
  totalCost: number;
  /** Currency code (e.g., "USD") */
  currency: string;
  /** Percentage of total costs (0-100) */
  percentage: number;
}

export interface CostChartProps {
  /** Array of cost trend data points */
  data: CostTrend[];
  /** Loading state */
  isLoading?: boolean;
}

export interface CostByServiceTableProps {
  /** Array of cost by service data */
  data: CostByService[];
  /** Loading state */
  isLoading?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export type SortableColumn = 'service' | 'provider' | 'totalCost' | 'percentage';

/**
 * Cost Overview Data
 */
export interface CostOverview {
  /** Current month total spend */
  currentMonth: number;
  /** Previous month total spend */
  previousMonth: number;
  /** Trend direction */
  trend: 'up' | 'down' | 'stable';
  /** Percentage change from previous month */
  percentageChange: number;
  /** Forecasted end-of-month spend */
  forecast: number;
  /** Top service by cost */
  topService: string;
  /** Cost of top service */
  topServiceCost?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Date Range
 */
export interface DateRange {
  /** Start date */
  start: Date;
  /** End date */
  end: Date;
}

/**
 * Date Range Preset
 */
export interface DatePreset {
  /** Display label for the preset */
  label: string;
  /** Function that returns the date range */
  getValue: () => DateRange;
}

/**
 * Forecast Data Point
 */
export interface ForecastPoint {
  /** Date of the forecast */
  date: string;
  /** Forecasted cost */
  cost: number;
  /** Whether this is a forecast or historical data */
  isForecast: boolean;
}

/**
 * Budget Alert Configuration
 */
export interface BudgetAlert {
  /** Monthly budget amount */
  budget: number;
  /** Current spend */
  currentSpend: number;
  /** Threshold percentage for warnings (e.g., 80 for 80%) */
  warningThreshold?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Service Breakdown View Mode
 */
export type ServiceViewMode = 'chart' | 'table';

/**
 * Chart Type for Service Breakdown
 */
export type ServiceChartType = 'pie' | 'bar';

/**
 * Export Format
 */
export type ExportFormat = 'csv' | 'pdf' | 'json';

/**
 * Cost Filter Options
 */
export interface CostFilters {
  /** Cloud provider filter */
  provider?: 'AWS' | 'Azure' | 'ALL';
  /** Service name filter */
  service?: string;
  /** Date range filter */
  dateRange?: DateRange;
  /** Minimum cost threshold */
  minCost?: number;
  /** Account ID filter */
  accountId?: string;
}

/**
 * Cost Analytics Summary
 */
export interface CostSummary {
  /** Total cost for the period */
  totalCost: number;
  /** Average daily cost */
  averageDailyCost: number;
  /** Highest daily cost */
  peakDailyCost: number;
  /** Date of highest cost */
  peakDate?: string;
  /** Number of services */
  serviceCount: number;
  /** Currency code */
  currency: string;
}
