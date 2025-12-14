/**
 * Cost Analysis Utilities
 * Helper functions for formatting, calculating, and exporting cost data
 */

import { CostTrend } from '@/lib/api/finops';

/**
 * Format a number as currency with proper locale support
 *
 * @param amount - The numeric amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * formatCurrency(1234.56) // "$1,235"
 * formatCurrency(1234.56, 'EUR') // "€1,235"
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency codes
    console.error(`Invalid currency code: ${currency}`, error);
    return `$${amount.toFixed(0)}`;
  }
}

/**
 * Format currency with decimal precision
 *
 * @param amount - The numeric amount to format
 * @param currency - Currency code (default: 'USD')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string with decimals
 *
 * @example
 * formatCurrencyDetailed(1234.56) // "$1,234.56"
 */
export function formatCurrencyDetailed(
  amount: number,
  currency: string = 'USD',
  decimals: number = 2
): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    console.error(`Invalid currency code: ${currency}`, error);
    return `$${amount.toFixed(decimals)}`;
  }
}

/**
 * Format a number as percentage
 *
 * @param value - The percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(45.234) // "45.2%"
 * formatPercentage(45.234, 0) // "45%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate trend direction based on current and previous values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Trend direction: 'up', 'down', or 'stable'
 *
 * @example
 * calculateTrend(1200, 1000) // 'up'
 * calculateTrend(1000, 1200) // 'down'
 * calculateTrend(1000, 1005) // 'stable'
 */
export function calculateTrend(
  current: number,
  previous: number
): 'up' | 'down' | 'stable' {
  if (previous === 0) return 'stable';

  const percentageChange = ((current - previous) / previous) * 100;

  // Consider changes less than 1% as stable
  if (Math.abs(percentageChange) < 1) return 'stable';

  return percentageChange > 0 ? 'up' : 'down';
}

/**
 * Calculate percentage change between two values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change (positive for increase, negative for decrease)
 *
 * @example
 * calculatePercentageChange(1200, 1000) // 20
 * calculatePercentageChange(800, 1000) // -20
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Simple linear regression forecast for end-of-month cost prediction
 * Uses least squares method to fit a line through the data points
 *
 * @param dailyCosts - Array of daily cost data with date and cost
 * @param daysInMonth - Total days in the month (default: 30)
 * @returns Predicted end-of-month cost
 *
 * @example
 * const costs = [
 *   { date: '2024-01-01', cost: 100 },
 *   { date: '2024-01-02', cost: 105 },
 *   // ... more daily costs
 * ];
 * forecastCost(costs, 31) // 3200
 */
export function forecastCost(
  dailyCosts: Array<{ date: string; cost: number }>,
  daysInMonth: number = 30
): number {
  if (dailyCosts.length === 0) return 0;
  if (dailyCosts.length === 1) return dailyCosts[0].cost * daysInMonth;

  // Simple linear regression using least squares
  const n = dailyCosts.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  dailyCosts.forEach((point, index) => {
    const x = index + 1; // Day number
    const y = point.cost;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate sum for all days in the month
  let totalForecast = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const predictedCost = slope * day + intercept;
    // Ensure predicted cost is not negative
    totalForecast += Math.max(0, predictedCost);
  }

  return totalForecast;
}

/**
 * Generate forecast data points for visualization
 * Creates future data points based on the trend
 *
 * @param dailyCosts - Historical daily cost data
 * @param futureDays - Number of days to forecast (default: 7)
 * @returns Array of forecast data points
 */
export function generateForecast(
  dailyCosts: CostTrend[],
  futureDays: number = 7
): Array<{ date: string; cost: number; isForecast: boolean }> {
  if (dailyCosts.length === 0) return [];

  // Calculate average daily change
  const n = dailyCosts.length;
  if (n < 2) return [];

  const totalChanges = dailyCosts.slice(1).reduce((sum, point, index) => {
    return sum + (point.total - dailyCosts[index].total);
  }, 0);

  const averageDailyChange = totalChanges / (n - 1);

  // Get the last date and cost
  const lastPoint = dailyCosts[dailyCosts.length - 1];
  const lastDate = new Date(lastPoint.date);
  let lastCost = lastPoint.total;

  // Generate forecast points
  const forecast: Array<{ date: string; cost: number; isForecast: boolean }> = [];

  for (let i = 1; i <= futureDays; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    const forecastCost = Math.max(0, lastCost + (averageDailyChange * i));

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      cost: forecastCost,
      isForecast: true,
    });
  }

  return forecast;
}

/**
 * Export data to CSV format and trigger download
 *
 * @param data - Array of objects to export
 * @param filename - Name of the CSV file (without extension)
 *
 * @example
 * exportToCSV(services, 'cost-by-service-2024-01')
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Get color for trend visualization
 *
 * @param trend - Trend direction
 * @returns Tailwind color classes
 */
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  const colors = {
    up: 'text-red-600', // Cost increase is negative
    down: 'text-green-600', // Cost decrease is positive
    stable: 'text-gray-600',
  };
  return colors[trend];
}

/**
 * Get background color for trend visualization
 *
 * @param trend - Trend direction
 * @returns Tailwind background color classes
 */
export function getTrendBgColor(trend: 'up' | 'down' | 'stable'): string {
  const colors = {
    up: 'bg-red-50',
    down: 'bg-green-50',
    stable: 'bg-gray-50',
  };
  return colors[trend];
}

/**
 * Format compact currency for large numbers
 * Converts to K, M, B notation for readability
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Compact formatted string
 *
 * @example
 * formatCurrencyCompact(1500) // "$1.5K"
 * formatCurrencyCompact(1500000) // "$1.5M"
 */
export function formatCurrencyCompact(amount: number, currency: string = 'USD'): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  if (absAmount >= 1e9) {
    return `${sign}${symbol}${(absAmount / 1e9).toFixed(1)}B`;
  } else if (absAmount >= 1e6) {
    return `${sign}${symbol}${(absAmount / 1e6).toFixed(1)}M`;
  } else if (absAmount >= 1e3) {
    return `${sign}${symbol}${(absAmount / 1e3).toFixed(1)}K`;
  }

  return formatCurrency(amount, currency);
}

/**
 * Calculate confidence level for forecast based on data variance
 *
 * @param dailyCosts - Historical daily cost data
 * @returns Confidence percentage (0-100)
 */
export function calculateForecastConfidence(
  dailyCosts: Array<{ date: string; cost: number }>
): number {
  if (dailyCosts.length < 7) return 50; // Low confidence with less than a week of data

  // Calculate variance in daily costs
  const costs = dailyCosts.map(d => d.cost);
  const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
  const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (CV)
  const cv = mean > 0 ? stdDev / mean : 1;

  // Convert CV to confidence (lower variance = higher confidence)
  // CV of 0 = 100% confidence, CV of 1 or more = 50% confidence
  const confidence = Math.max(50, Math.min(100, 100 - (cv * 50)));

  return Math.round(confidence);
}

/**
 * Group costs by time period
 *
 * @param costs - Array of cost data with dates
 * @param period - Grouping period: 'day', 'week', 'month'
 * @returns Grouped cost data
 */
export function groupCostsByPeriod(
  costs: Array<{ date: string; cost: number }>,
  period: 'day' | 'week' | 'month' = 'day'
): Array<{ date: string; cost: number }> {
  if (period === 'day') return costs;

  const grouped = new Map<string, number>();

  costs.forEach(({ date, cost }) => {
    const d = new Date(date);
    let key: string;

    if (period === 'week') {
      // Get the Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      key = monday.toISOString().split('T')[0];
    } else {
      // Month grouping
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }

    grouped.set(key, (grouped.get(key) || 0) + cost);
  });

  return Array.from(grouped.entries())
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
