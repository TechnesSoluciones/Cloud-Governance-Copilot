/**
 * Cost API Types
 * Type definitions for cost-related API responses
 */

export interface CostDataPoint {
  date: string;
  amount: number;
  provider?: 'aws' | 'azure' | 'gcp';
  service?: string;
}

export interface CostSummary {
  currentMonth: number;
  lastMonth: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
  currency: string;
}

export interface ServiceCost {
  serviceName: string;
  cost: number;
  percentage: number;
  provider: 'aws' | 'azure' | 'gcp';
}

export interface CostAnomaly {
  id: string;
  severity: 'high' | 'medium' | 'low';
  service: string;
  provider: 'aws' | 'azure' | 'gcp';
  expectedCost: number;
  actualCost: number;
  difference: number;
  date: string;
  message: string;
  dismissed?: boolean;
}

export interface CostMetrics {
  currentMonth: number;
  lastMonth: number;
  percentageChange: number;
  topService: ServiceCost | null;
  totalServices: number;
  anomalyCount: number;
}

export interface CostQueryParams {
  startDate?: string;
  endDate?: string;
  provider?: 'aws' | 'azure' | 'all';
  granularity?: 'daily' | 'weekly' | 'monthly';
}
