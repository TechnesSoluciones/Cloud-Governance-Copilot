/**
 * FinOps Costs Controller
 *
 * This controller handles all HTTP endpoints for cost management and anomaly detection.
 * It provides REST API access to cost data, trends, aggregations, and anomaly information.
 *
 * Endpoints:
 * - GET /api/finops/costs - Retrieve cost data with filters
 * - GET /api/finops/costs/by-service - Get cost aggregation by service
 * - GET /api/finops/costs/trends - Get cost trends over time with granularity
 * - GET /api/finops/anomalies - Retrieve anomalies with filters
 * - POST /api/finops/anomalies/:id/resolve - Mark anomaly as resolved
 *
 * Architecture:
 * - Input Validation: Uses Zod schemas for request validation
 * - Authorization: Tenant isolation enforced via JWT authentication
 * - Error Handling: Consistent error responses with proper HTTP status codes
 * - Data Aggregation: Efficient database queries with groupBy and aggregation
 *
 * @module FinOps/Controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { AnomalyDetectionService } from '../services';
import { EventEmitter } from 'events';
import { cacheResponse, CachePresets } from '../../../lib/cache';

// ============================================================
// Type Extensions
// ============================================================

/**
 * Extended Express Request type with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

// ============================================================
// Prisma Client & Services Initialization
// ============================================================
const eventBus = new EventEmitter();
const anomalyService = new AnomalyDetectionService(prisma, eventBus);

// ============================================================
// Validation Schemas (Zod)
// ============================================================

/**
 * Schema for GET /api/finops/costs query parameters
 */
const getCostsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format. Expected YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format. Expected YYYY-MM-DD'),
  provider: z.enum(['aws', 'azure', 'gcp']).optional(),
  service: z.string().min(1).optional(),
});

/**
 * Schema for GET /api/finops/costs/by-service query parameters
 */
const getCostsByServiceSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format. Expected YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format. Expected YYYY-MM-DD'),
  provider: z.enum(['aws', 'azure', 'gcp']).optional(),
});

/**
 * Schema for GET /api/finops/costs/trends query parameters
 */
const getTrendsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format. Expected YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format. Expected YYYY-MM-DD'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
});

/**
 * Schema for GET /api/finops/anomalies query parameters
 */
const getAnomaliesSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format. Expected YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format. Expected YYYY-MM-DD').optional(),
  provider: z.enum(['aws', 'azure', 'gcp']).optional(),
  service: z.string().min(1).optional(),
});

/**
 * Schema for POST /api/finops/anomalies/:id/resolve request body
 */
const resolveAnomalySchema = z.object({
  resolution: z.string().min(10, 'Resolution description must be at least 10 characters'),
  resolvedBy: z.string().uuid().optional(),
});

// ============================================================
// Helper Types
// ============================================================

/**
 * Interface for aggregated service costs
 */
interface ServiceCostSummary {
  service: string;
  provider: string;
  totalCost: number;
  percentage: number;
}

/**
 * Interface for trend data point
 */
interface TrendDataPoint {
  date: string;
  totalCost: number;
  currency: string;
}

// ============================================================
// Costs Controller Class
// ============================================================

/**
 * Controller for handling FinOps cost and anomaly endpoints
 *
 * @example
 * ```typescript
 * const controller = new CostsController();
 * router.get('/costs', controller.getCosts.bind(controller));
 * ```
 */
export class CostsController {
  /**
   * GET /api/finops/costs
   *
   * Retrieves cost data for a tenant within a specified date range.
   * Supports filtering by provider and service.
   *
   * Query Parameters:
   * - startDate (required): ISO 8601 date string
   * - endDate (required): ISO 8601 date string
   * - provider (optional): 'aws' | 'azure' | 'gcp'
   * - service (optional): Service name
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "date": "2024-01-15",
   *       "service": "Amazon EC2",
   *       "provider": "aws",
   *       "amount": 150.50,
   *       "currency": "USD"
   *     }
   *   ],
   *   "total": 2500.00,
   *   "currency": "USD"
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getCosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = getCostsSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[CostsController] getCosts - Tenant: ${tenantId}, DateRange: ${query.startDate} to ${query.endDate}`);

      // Step 3: Cache key includes date range and filters
      const cacheKey = `costs:${query.startDate}:${query.endDate}${query.provider ? `:${query.provider}` : ''}${query.service ? `:${query.service}` : ''}`;

      // Step 4: Execute with caching
      const result = await cacheResponse(
        cacheKey,
        async () => {
          // Build Prisma where clause with filters
          const where: any = {
            tenantId,
            date: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          };

          if (query.provider) {
            where.provider = query.provider;
          }

          if (query.service) {
            where.service = query.service;
          }

          // Query cost data from database
          const costs = await prisma.costData.findMany({
            where,
            orderBy: { date: 'asc' },
          });

          console.log(`[CostsController] getCosts - Retrieved ${costs.length} cost records`);

          // Calculate total cost
          const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);

          // Return formatted response
          return {
            success: true,
            data: costs.map((cost) => ({
              date: cost.date.toISOString().split('T')[0],
              service: cost.service,
              provider: cost.provider,
              amount: Number(cost.amount),
              currency: cost.currency,
            })),
            total: Math.round(total * 100) / 100,
            currency: 'USD',
          };
        },
        CachePresets.COSTS
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'getCosts');
    }
  }

  /**
   * GET /api/finops/costs/by-service
   *
   * Retrieves cost data aggregated by service with percentage breakdown.
   * Useful for pie charts and service cost distribution analysis.
   *
   * Query Parameters:
   * - startDate (required): ISO 8601 date string
   * - endDate (required): ISO 8601 date string
   * - provider (optional): 'aws' | 'azure' | 'gcp'
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "service": "Amazon EC2",
   *       "provider": "aws",
   *       "totalCost": 1500.00,
   *       "percentage": 60.0
   *     }
   *   ]
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getCostsByService(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = getCostsByServiceSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[CostsController] getCostsByService - Tenant: ${tenantId}`);

      // Step 3: Cache key includes date range and provider filter
      const cacheKey = `costs-by-service:${query.startDate}:${query.endDate}${query.provider ? `:${query.provider}` : ''}`;

      // Step 4: Execute with caching
      const result = await cacheResponse(
        cacheKey,
        async () => {
          // Build Prisma where clause
          const where: any = {
            tenantId,
            date: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          };

          if (query.provider) {
            where.provider = query.provider;
          }

          // Aggregate costs by service and provider
          const aggregatedCosts = await prisma.costData.groupBy({
            by: ['service', 'provider'],
            where,
            _sum: {
              amount: true,
            },
          });

          console.log(`[CostsController] getCostsByService - Aggregated ${aggregatedCosts.length} services`);

          // Calculate total for percentage calculation
          const grandTotal = aggregatedCosts.reduce(
            (sum, item) => sum + Number(item._sum.amount || 0),
            0
          );

          // Transform and calculate percentages
          const serviceCosts: ServiceCostSummary[] = aggregatedCosts.map((item) => {
            const totalCost = Number(item._sum.amount || 0);
            const percentage = grandTotal > 0 ? (totalCost / grandTotal) * 100 : 0;

            return {
              service: item.service,
              provider: item.provider,
              totalCost: Math.round(totalCost * 100) / 100,
              percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
            };
          });

          // Sort by totalCost descending
          serviceCosts.sort((a, b) => b.totalCost - a.totalCost);

          return {
            success: true,
            data: serviceCosts,
          };
        },
        CachePresets.COSTS
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'getCostsByService');
    }
  }

  /**
   * GET /api/finops/costs/trends
   *
   * Retrieves cost trends over time with configurable granularity.
   * Supports daily, weekly, and monthly aggregation.
   *
   * Query Parameters:
   * - startDate (required): ISO 8601 date string
   * - endDate (required): ISO 8601 date string
   * - granularity (optional): 'daily' | 'weekly' | 'monthly' (default: daily)
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "date": "2024-01-15",
   *       "totalCost": 150.50,
   *       "currency": "USD"
   *     }
   *   ]
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getCostTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = getTrendsSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[CostsController] getCostTrends - Tenant: ${tenantId}, Granularity: ${query.granularity}`);

      // Step 3: Cache key includes date range and granularity
      const cacheKey = `costs-trends:${query.startDate}:${query.endDate}:${query.granularity}`;

      // Step 4: Execute with caching
      const result = await cacheResponse(
        cacheKey,
        async () => {
          // Query all costs in date range
          const costs = await prisma.costData.findMany({
            where: {
              tenantId,
              date: {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
              },
            },
            orderBy: { date: 'asc' },
          });

          console.log(`[CostsController] getCostTrends - Retrieved ${costs.length} cost records`);

          // Aggregate by granularity
          const trends = this.aggregateTrends(costs, query.granularity);

          return {
            success: true,
            data: trends,
          };
        },
        CachePresets.COSTS
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'getCostTrends');
    }
  }

  /**
   * GET /api/finops/anomalies
   *
   * Retrieves cost anomalies with flexible filtering options.
   * Supports filtering by status, severity, date range, provider, and service.
   *
   * Query Parameters:
   * - status (optional): 'open' | 'investigating' | 'resolved' | 'dismissed'
   * - severity (optional): 'low' | 'medium' | 'high' | 'critical'
   * - startDate (optional): ISO 8601 date string
   * - endDate (optional): ISO 8601 date string
   * - provider (optional): 'aws' | 'azure' | 'gcp'
   * - service (optional): Service name
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "date": "2024-01-15",
   *       "service": "Amazon EC2",
   *       "provider": "aws",
   *       "severity": "high",
   *       "status": "open",
   *       "expectedCost": 100.00,
   *       "actualCost": 350.00,
   *       "deviation": 250.0,
   *       "detectedAt": "2024-01-16T02:00:00Z"
   *     }
   *   ],
   *   "count": 5
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getAnomalies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = getAnomaliesSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[CostsController] getAnomalies - Tenant: ${tenantId}`);

      // Step 3: Build cache key from filters
      const filterKey = [
        query.status || 'all',
        query.severity || 'all',
        query.provider || 'all',
        query.service || 'all',
        query.startDate || 'all',
        query.endDate || 'all',
      ].join(':');
      const cacheKey = `anomalies:${filterKey}`;

      // Step 4: Execute with caching
      const result = await cacheResponse(
        cacheKey,
        async () => {
          // Build filters for anomaly service
          const filters: any = {};

          if (query.status) filters.status = query.status;
          if (query.severity) filters.severity = query.severity;
          if (query.provider) filters.provider = query.provider;
          if (query.service) filters.service = query.service;

          if (query.startDate) {
            filters.startDate = new Date(query.startDate);
          }
          if (query.endDate) {
            filters.endDate = new Date(query.endDate);
          }

          // Query anomalies using AnomalyDetectionService
          const anomalies = await anomalyService.getAnomaliesForTenant(tenantId, filters);

          console.log(`[CostsController] getAnomalies - Retrieved ${anomalies.length} anomalies`);

          // Format response
          return {
            success: true,
            data: anomalies.map((anomaly) => ({
              id: anomaly.id,
              date: anomaly.date.toISOString().split('T')[0],
              service: anomaly.service,
              provider: anomaly.provider,
              severity: anomaly.severity,
              status: anomaly.status,
              expectedCost: Number(anomaly.expectedCost),
              actualCost: Number(anomaly.actualCost),
              deviation: Number(anomaly.deviation),
              detectedAt: anomaly.detectedAt.toISOString(),
              resourceId: anomaly.resourceId,
              rootCause: anomaly.rootCause,
              resolvedAt: anomaly.resolvedAt?.toISOString(),
              resolvedBy: anomaly.resolvedBy,
            })),
            count: anomalies.length,
          };
        },
        CachePresets.COSTS
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res, 'getAnomalies');
    }
  }

  /**
   * POST /api/finops/anomalies/:id/resolve
   *
   * Marks a cost anomaly as resolved with a resolution description.
   * Updates the anomaly status and records resolution metadata.
   *
   * URL Parameters:
   * - id: Anomaly UUID
   *
   * Request Body:
   * ```json
   * {
   *   "resolution": "False positive - planned deployment",
   *   "resolvedBy": "user-id" // Optional
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "status": "resolved",
   *     "rootCause": {...},
   *     "resolvedAt": "2024-01-16T10:00:00Z"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async resolveAnomaly(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate request body
      const body = resolveAnomalySchema.parse(req.body);

      // Step 2: Extract anomaly ID from URL params
      const anomalyId = req.params.id;

      if (!anomalyId) {
        res.status(400).json({
          success: false,
          error: 'Anomaly ID is required',
        });
        return;
      }

      // Step 3: Extract tenantId and userId from authenticated user
      if (!req.user?.tenantId || !req.user?.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.userId;

      console.log(`[CostsController] resolveAnomaly - Anomaly: ${anomalyId}, User: ${userId}`);

      // Step 4: Verify anomaly belongs to tenant
      const anomaly = await prisma.costAnomaly.findUnique({
        where: { id: anomalyId },
      });

      if (!anomaly) {
        res.status(404).json({
          success: false,
          error: 'Anomaly not found',
        });
        return;
      }

      if (anomaly.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - Anomaly does not belong to your tenant',
        });
        return;
      }

      if (anomaly.status === 'resolved') {
        res.status(400).json({
          success: false,
          error: 'Anomaly is already resolved',
        });
        return;
      }

      // Step 5: Update anomaly status to resolved
      const resolvedBy = body.resolvedBy || userId;
      const updatedAnomaly = await prisma.costAnomaly.update({
        where: { id: anomalyId },
        data: {
          status: 'resolved',
          rootCause: {
            type: 'manual_resolution',
            description: body.resolution,
            resolvedBy: resolvedBy,
            timestamp: new Date().toISOString(),
          },
          resolvedAt: new Date(),
          resolvedBy,
        },
      });

      console.log(`[CostsController] resolveAnomaly - Anomaly ${anomalyId} resolved successfully`);

      // Step 6: Emit event for audit trail (optional)
      eventBus.emit('anomaly.resolved', {
        anomalyId: updatedAnomaly.id,
        tenantId,
        resolvedBy,
        resolution: body.resolution,
      });

      res.json({
        success: true,
        data: {
          id: updatedAnomaly.id,
          status: updatedAnomaly.status,
          rootCause: updatedAnomaly.rootCause,
          resolvedAt: updatedAnomaly.resolvedAt?.toISOString(),
          resolvedBy: updatedAnomaly.resolvedBy,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'resolveAnomaly');
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Aggregates cost data by specified granularity (daily, weekly, monthly)
   *
   * @param costs - Array of cost data records
   * @param granularity - Aggregation granularity
   * @returns Array of trend data points
   * @private
   */
  private aggregateTrends(
    costs: any[],
    granularity: 'daily' | 'weekly' | 'monthly'
  ): TrendDataPoint[] {
    const groupedCosts = new Map<string, number>();

    for (const cost of costs) {
      const date = new Date(cost.date);
      let key: string;

      switch (granularity) {
        case 'daily':
          // Format: YYYY-MM-DD
          key = date.toISOString().split('T')[0];
          break;

        case 'weekly':
          // Format: YYYY-Www (ISO week number)
          const weekNumber = this.getISOWeek(date);
          const year = date.getFullYear();
          key = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
          break;

        case 'monthly':
          // Format: YYYY-MM
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;

        default:
          key = date.toISOString().split('T')[0];
      }

      const currentAmount = groupedCosts.get(key) || 0;
      groupedCosts.set(key, currentAmount + Number(cost.amount));
    }

    // Convert to array and sort by date
    const trends: TrendDataPoint[] = Array.from(groupedCosts.entries())
      .map(([date, totalCost]) => ({
        date,
        totalCost: Math.round(totalCost * 100) / 100,
        currency: 'USD',
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trends;
  }

  /**
   * Calculates ISO week number for a given date
   *
   * @param date - Date to calculate week number for
   * @returns ISO week number (1-53)
   * @private
   */
  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNumber;
  }

  /**
   * Centralized error handling for consistent error responses
   *
   * @param error - Error object
   * @param res - Express response object
   * @param method - Method name for logging
   * @private
   */
  private handleError(error: any, res: Response, method: string): void {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error(`[CostsController] ${method} - Validation error:`, error.errors);
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    // Log internal server errors
    console.error(`[CostsController] ${method} - Internal error:`, error);

    // Return generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}

// ============================================================
// Export Controller Instance
// ============================================================

/**
 * Singleton instance of CostsController
 * Used for binding to Express routes
 */
export const costsController = new CostsController();
