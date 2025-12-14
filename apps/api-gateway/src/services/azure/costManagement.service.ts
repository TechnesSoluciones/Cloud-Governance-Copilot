/**
 * Azure Cost Management Service
 * Provides cost analysis and billing data from Azure Cost Management API
 *
 * Security Features:
 * - Input validation for date ranges
 * - Rate limiting to prevent API throttling
 * - Redis caching to reduce API calls
 * - Timeout configuration for reliability
 * - Comprehensive error handling
 */

import { CostManagementClient } from '@azure/arm-costmanagement';
import { AzureCredentialsService } from './azureCredentials.service';
import { azureConfig } from '../../config/azure.config';
import { AzureRateLimiterService } from './azureRateLimiter.service';
import { AzureCacheService } from './azureCache.service';
import { logger } from '../../services/logger.service';
import { metricsService } from '../../services/metrics.service';

export interface CostSummary {
  currentMonth: number;
  previousMonth: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  topServices: Array<{ service: string; cost: number }>;
}

export interface ServiceCost {
  service: string;
  cost: number;
}

export interface DailyCost {
  date: string;
  cost: number;
}

/**
 * Azure Cost Management Service
 */
export class AzureCostManagementService {
  /**
   * Validate date range for cost queries
   * Ensures dates are valid and not in the future
   */
  private static validateDateRange(startDate: Date, endDate: Date): void {
    const now = new Date();

    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new Error('Invalid end date');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    if (endDate > now) {
      throw new Error('End date cannot be in the future');
    }

    // Validate range is not too large (max 12 months)
    const monthsDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsDiff > 12) {
      throw new Error('Date range cannot exceed 12 months');
    }
  }

  /**
   * Format date for Azure Cost Management API (YYYY-MM-DD)
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the start and end dates for a month
   */
  private static getMonthRange(monthsAgo: number = 0): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);

    // If current month, use today as end date
    if (monthsAgo === 0) {
      return { start, end: now };
    }

    return { start, end };
  }

  /**
   * Execute a cost query against Azure Cost Management API with security controls
   * @param accountId - Cloud account ID
   * @param scope - Cost scope (subscription or resource group)
   * @param queryDefinition - Cost query definition
   * @returns Query results
   */
  private static async executeQuery(
    accountId: string,
    scope: string,
    queryDefinition: any
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Check rate limit before making API call
      const rateLimit = await AzureRateLimiterService.checkRateLimit(
        'costManagement',
        accountId
      );

      if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded for Cost Management', {
          cloudAccountId: accountId,
          operation: 'costManagement.query',
          retryAfter: rateLimit.retryAfter,
        });

        // Record rate limit metric
        metricsService.recordAzureApiError(
          'CostManagement',
          'query',
          'RateLimitExceeded'
        );

        throw new Error(
          `Rate limit exceeded. Please retry after ${rateLimit.retryAfter} seconds.`
        );
      }

      const credential = await AzureCredentialsService.getTokenCredential(accountId);

      // Create client
      const client = new CostManagementClient(credential);

      // Execute cost query
      logger.debug('Executing Azure Cost Management query', {
        cloudAccountId: accountId,
        operation: 'costManagement.query',
        scope,
        timeframe: queryDefinition.timeframe,
      });

      const result = await client.query.usage(scope, queryDefinition);

      // Record successful API call metrics
      const duration = Date.now() - startTime;
      metricsService.recordAzureApiCall('CostManagement', 'query', 'success', duration);

      // Log slow queries
      if (duration > 2000) {
        logger.warn('Slow Azure Cost Management query detected', {
          cloudAccountId: accountId,
          operation: 'costManagement.query',
          duration,
          threshold: 2000,
        });
      } else {
        logger.info('Azure Cost Management query completed', {
          cloudAccountId: accountId,
          operation: 'costManagement.query',
          duration,
        });
      }

      // Consume rate limit token after successful call
      await AzureRateLimiterService.consumeToken('costManagement', accountId);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Record failed API call metrics
      metricsService.recordAzureApiCall('CostManagement', 'query', 'error', duration);

      // Log error without exposing sensitive information
      logger.error('Azure Cost Management query failed', {
        cloudAccountId: accountId,
        operation: 'costManagement.query',
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        errorCode: error.code,
        statusCode: error.statusCode,
      });

      // Record specific error types
      if (error.code === 'NoValidSubscription') {
        metricsService.recordAzureApiError('CostManagement', 'query', 'NoValidSubscription');
        throw new Error('Subscription is not valid for Cost Management API');
      }

      if (error.code === 'AuthorizationFailed') {
        metricsService.recordAzureApiError('CostManagement', 'query', 'AuthorizationFailed');
        throw new Error('Insufficient permissions. Cost Management Reader role required.');
      }

      if (error.statusCode === 429 || error.code === 'TooManyRequests') {
        metricsService.recordAzureApiError('CostManagement', 'query', 'TooManyRequests');
        throw new Error('Azure API rate limit exceeded. Please retry later.');
      }

      // Record generic error
      metricsService.recordAzureApiError(
        'CostManagement',
        'query',
        error.code || 'UnknownError'
      );

      // Sanitize error message to avoid leaking sensitive info
      const sanitizedMessage = error.message?.includes('credentials')
        ? 'Authentication failed'
        : error.message;

      throw new Error(`Failed to execute Cost Management query: ${sanitizedMessage}`);
    }
  }

  /**
   * Get cost summary for current and previous month with caching
   * @param accountId - Cloud account ID
   * @returns Cost summary including trends and top services
   */
  static async getCostSummary(accountId: string): Promise<CostSummary> {
    // Use cache-aside pattern with 1 hour TTL (costs don't change frequently)
    return AzureCacheService.getOrSet(
      'costs',
      accountId,
      ['summary'],
      async () => {
        try {
          const credentials = await AzureCredentialsService.getCredentials(accountId);
          const scope = `/subscriptions/${credentials.subscriptionId}`;

          // Get current and previous month data in parallel
          const [currentMonthData, previousMonthData] = await Promise.all([
            this.getMonthCosts(accountId, scope, 0),
            this.getMonthCosts(accountId, scope, 1),
          ]);

          const currentMonth = currentMonthData.totalCost;
          const previousMonth = previousMonthData.totalCost;

          // Calculate trend and percentage change
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let percentageChange = 0;

          if (previousMonth > 0) {
            percentageChange = ((currentMonth - previousMonth) / previousMonth) * 100;

            if (Math.abs(percentageChange) < 5) {
              trend = 'stable';
            } else if (currentMonth > previousMonth) {
              trend = 'up';
            } else {
              trend = 'down';
            }
          } else if (currentMonth > 0) {
            trend = 'up';
            percentageChange = 100;
          }

          // Get top services from current month
          const topServices = currentMonthData.serviceBreakdown
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 5);

          // Record business metric for cost queries
          metricsService.incrementBusinessMetric('cost_queries', {
            operation: 'getCostSummary',
          });

          // Log successful cost summary retrieval
          logger.info('Cost summary retrieved successfully', {
            cloudAccountId: accountId,
            operation: 'getCostSummary',
            currentMonth,
            previousMonth,
            trend,
            topServicesCount: topServices.length,
          });

          return {
            currentMonth: Math.round(currentMonth * 100) / 100,
            previousMonth: Math.round(previousMonth * 100) / 100,
            trend,
            percentageChange: Math.round(percentageChange * 100) / 100,
            topServices,
          };
        } catch (error: any) {
          // If no cost data available (new subscription), return zeros
          if (error.message?.includes('No valid subscription') ||
              error.message?.includes('NoDataFound')) {
            logger.info('No cost data available for account', { accountId });
            return {
              currentMonth: 0,
              previousMonth: 0,
              trend: 'stable',
              percentageChange: 0,
              topServices: [],
            };
          }

          logger.error('Failed to get cost summary', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get costs for a specific month
   * @param accountId - Cloud account ID
   * @param scope - Cost scope
   * @param monthsAgo - Number of months ago (0 = current month)
   * @returns Total cost and service breakdown
   */
  private static async getMonthCosts(
    accountId: string,
    scope: string,
    monthsAgo: number
  ): Promise<{ totalCost: number; serviceBreakdown: ServiceCost[] }> {
    const { start, end } = this.getMonthRange(monthsAgo);

    const queryDefinition = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: this.formatDate(start),
        to: this.formatDate(end),
      },
      dataset: {
        granularity: 'None',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
        grouping: [
          {
            type: 'Dimension',
            name: 'ServiceName',
          },
        ],
      },
    };

    try {
      const result = await this.executeQuery(accountId, scope, queryDefinition);

      let totalCost = 0;
      const serviceBreakdown: ServiceCost[] = [];

      // Parse results
      if (result.rows && result.rows.length > 0) {
        for (const row of result.rows) {
          const cost = parseFloat(row[0]) || 0;
          const serviceName = row[1] || 'Unknown';

          totalCost += cost;
          serviceBreakdown.push({
            service: serviceName,
            cost: Math.round(cost * 100) / 100,
          });
        }
      }

      return {
        totalCost: Math.round(totalCost * 100) / 100,
        serviceBreakdown,
      };
    } catch (error: any) {
      // Return empty data if query fails
      logger.warn('Failed to get month costs', {
        accountId,
        monthsAgo,
        error: error.message,
      });

      return {
        totalCost: 0,
        serviceBreakdown: [],
      };
    }
  }

  /**
   * Get cost breakdown by service for a date range
   * @param accountId - Cloud account ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of service costs
   */
  static async getCostByService(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceCost[]> {
    // Validate input dates
    this.validateDateRange(startDate, endDate);

    // Use cache with 1 hour TTL
    return AzureCacheService.getOrSet(
      'costs',
      accountId,
      ['by-service', this.formatDate(startDate), this.formatDate(endDate)],
      async () => {
        try {
          const credentials = await AzureCredentialsService.getCredentials(accountId);
          const scope = `/subscriptions/${credentials.subscriptionId}`;

          const queryDefinition = {
            type: 'ActualCost',
            timeframe: 'Custom',
            timePeriod: {
              from: this.formatDate(startDate),
              to: this.formatDate(endDate),
            },
            dataset: {
              granularity: 'None',
              aggregation: {
                totalCost: {
                  name: 'Cost',
                  function: 'Sum',
                },
              },
              grouping: [
                {
                  type: 'Dimension',
                  name: 'ServiceName',
                },
              ],
            },
          };

          const result = await this.executeQuery(accountId, scope, queryDefinition);

          const serviceCosts: ServiceCost[] = [];

          if (result.rows && result.rows.length > 0) {
            for (const row of result.rows) {
              const cost = parseFloat(row[0]) || 0;
              const serviceName = row[1] || 'Unknown';

              serviceCosts.push({
                service: serviceName,
                cost: Math.round(cost * 100) / 100,
              });
            }
          }

          // Sort by cost descending
          return serviceCosts.sort((a, b) => b.cost - a.cost);
        } catch (error: any) {
          logger.error('Failed to get cost by service', {
            accountId,
            startDate,
            endDate,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get daily cost data for charting
   * @param accountId - Cloud account ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of daily costs
   */
  static async getDailyCosts(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyCost[]> {
    // Validate input dates
    this.validateDateRange(startDate, endDate);

    // Use cache with 1 hour TTL
    return AzureCacheService.getOrSet(
      'costs',
      accountId,
      ['daily', this.formatDate(startDate), this.formatDate(endDate)],
      async () => {
        try {
          const credentials = await AzureCredentialsService.getCredentials(accountId);
          const scope = `/subscriptions/${credentials.subscriptionId}`;

          const queryDefinition = {
            type: 'ActualCost',
            timeframe: 'Custom',
            timePeriod: {
              from: this.formatDate(startDate),
              to: this.formatDate(endDate),
            },
            dataset: {
              granularity: 'Daily',
              aggregation: {
                totalCost: {
                  name: 'Cost',
                  function: 'Sum',
                },
              },
            },
          };

          const result = await this.executeQuery(accountId, scope, queryDefinition);

          const dailyCosts: DailyCost[] = [];

          if (result.rows && result.rows.length > 0) {
            for (const row of result.rows) {
              const cost = parseFloat(row[0]) || 0;
              const date = row[1] || '';

              dailyCosts.push({
                date,
                cost: Math.round(cost * 100) / 100,
              });
            }
          }

          // Sort by date ascending
          return dailyCosts.sort((a, b) => a.date.localeCompare(b.date));
        } catch (error: any) {
          logger.error('Failed to get daily costs', {
            accountId,
            startDate,
            endDate,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get cost forecast for the current month
   * @param accountId - Cloud account ID
   * @returns Forecasted cost for the month
   */
  static async getCostForecast(accountId: string): Promise<{
    forecastedCost: number;
    confidence: 'high' | 'medium' | 'low';
  }> {
    // Use cache with 6 hour TTL
    return AzureCacheService.getOrSet(
      'costs',
      accountId,
      ['forecast', 'current-month'],
      async () => {
        try {
          const credentials = await AzureCredentialsService.getCredentials(accountId);
          const scope = `/subscriptions/${credentials.subscriptionId}`;

          const now = new Date();
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          const queryDefinition = {
            type: 'Usage',
            timeframe: 'Custom',
            timePeriod: {
              from: this.formatDate(now),
              to: this.formatDate(monthEnd),
            },
            dataset: {
              granularity: 'Daily',
              aggregation: {
                totalCost: {
                  name: 'Cost',
                  function: 'Sum',
                },
              },
            },
            includeActualCost: true,
            includeFreshPartialCost: true,
          };

          const result = await this.executeQuery(accountId, scope, queryDefinition);

          let forecastedCost = 0;

          if (result.rows && result.rows.length > 0) {
            for (const row of result.rows) {
              const cost = parseFloat(row[0]) || 0;
              forecastedCost += cost;
            }
          }

          // Determine confidence based on how much of the month has passed
          const dayOfMonth = now.getDate();
          const totalDaysInMonth = monthEnd.getDate();
          const monthProgress = dayOfMonth / totalDaysInMonth;

          let confidence: 'high' | 'medium' | 'low' = 'low';
          if (monthProgress > 0.7) {
            confidence = 'high';
          } else if (monthProgress > 0.4) {
            confidence = 'medium';
          }

          return {
            forecastedCost: Math.round(forecastedCost * 100) / 100,
            confidence,
          };
        } catch (error: any) {
          logger.warn('Failed to get cost forecast', {
            accountId,
            error: error.message,
          });

          // Return zero if forecast not available
          return {
            forecastedCost: 0,
            confidence: 'low',
          };
        }
      }
    );
  }

  /**
   * Invalidate cost cache for an account
   * Call this when cost data needs to be refreshed
   * @param accountId - Cloud account ID
   */
  static async invalidateCache(accountId: string): Promise<void> {
    await AzureCacheService.invalidateCategory('costs', accountId);
  }
}
