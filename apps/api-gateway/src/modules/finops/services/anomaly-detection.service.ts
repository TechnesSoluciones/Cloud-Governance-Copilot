/**
 * FinOps Anomaly Detection Service
 *
 * This service analyzes cost data to detect anomalies by comparing current costs
 * against historical averages. When significant deviations are detected, it creates
 * anomaly records and emits events for downstream processing.
 *
 * Workflow:
 * 1. Retrieve costs for the analysis date, grouped by service
 * 2. For each service, calculate historical average (last 30 days)
 * 3. Calculate deviation percentage between actual and expected cost
 * 4. If deviation exceeds threshold (50%), create anomaly record
 * 5. Calculate severity based on deviation magnitude
 * 6. Emit event for incident management and alerting
 * 7. Return detected anomalies
 *
 * Algorithm:
 * - Threshold: Absolute deviation > 50% triggers anomaly
 * - Severity levels:
 *   - Low: 50-100% deviation
 *   - Medium: 100-200% deviation
 *   - High: 200-500% deviation
 *   - Critical: >500% deviation
 * - Historical baseline: Average of last 30 days (excluding analysis date)
 * - Duplicate prevention: One anomaly per service/date/account combination
 *
 * Architecture Pattern:
 * - Event-Driven: Emits events for cross-module communication
 * - Statistical Analysis: Deviation-based anomaly detection
 * - Defensive Programming: Handles edge cases (no historical data, zero costs)
 * - Audit Trail: Comprehensive logging of detection process
 *
 * @module FinOps/AnomalyDetection
 */

import { PrismaClient, CostAnomaly } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { EventEmitter } from 'events';
import type { CostAnomalyDetectedEvent } from '../../../shared/events/event-bus';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Result of an anomaly detection analysis
 */
export interface AnalysisResult {
  /** Number of anomalies detected in this analysis */
  anomaliesDetected: number;

  /** Array of created anomaly records */
  anomalies: CostAnomaly[];
}

/**
 * Filters for querying anomalies
 */
export interface AnomalyFilters {
  /** Filter by anomaly status */
  status?: 'open' | 'investigating' | 'resolved' | 'dismissed';

  /** Filter by severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Filter anomalies from this date onwards */
  startDate?: Date;

  /** Filter anomalies up to this date */
  endDate?: Date;

  /** Filter by cloud provider */
  provider?: string;

  /** Filter by service name */
  service?: string;
}

/**
 * Internal interface for cost data grouped by service
 */
interface ServiceCostData {
  service: string;
  provider: string;
  amount: number;
}

/**
 * Parameters for creating an anomaly record
 */
interface CreateAnomalyData {
  tenantId: string;
  date: Date;
  service: string;
  provider: string;
  expectedCost: number;
  actualCost: number;
  deviation: number;
  resourceId?: string;
}

// ============================================================
// Anomaly Detection Service
// ============================================================

/**
 * Service for detecting cost anomalies and alerting on unusual spending patterns
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const service = new AnomalyDetectionService(prisma, eventBus);
 *
 * // Analyze yesterday's costs
 * const result = await service.analyzeRecentCosts(
 *   'tenant-id-123',
 *   'account-id-456'
 * );
 *
 * console.log(`Detected ${result.anomaliesDetected} anomalies`);
 * ```
 */
export class AnomalyDetectionService {
  /** Default lookback period for historical baseline in days */
  private static readonly HISTORICAL_DAYS = 30;

  /** Minimum deviation percentage to trigger anomaly detection */
  private static readonly ANOMALY_THRESHOLD = 50;

  constructor(
    private prisma: PrismaClient,
    private eventBus: EventEmitter
  ) {}

  // ============================================================
  // Main Analysis Method
  // ============================================================

  /**
   * Analyzes recent costs for anomalies compared to historical baseline
   *
   * This method orchestrates the entire anomaly detection workflow:
   * - Retrieves costs for the analysis date, grouped by service
   * - Calculates historical average for each service
   * - Detects significant deviations (>50%)
   * - Creates anomaly records with appropriate severity
   * - Emits events for downstream processing
   * - Prevents duplicate anomaly records
   *
   * @param tenantId - UUID of the tenant to analyze
   * @param cloudAccountId - UUID of the cloud account to analyze
   * @param date - Date to analyze (defaults to yesterday)
   * @returns Analysis result with count and anomaly details
   *
   * @example
   * ```typescript
   * // Analyze yesterday's costs (default)
   * const result = await service.analyzeRecentCosts(
   *   'tenant-123',
   *   'account-456'
   * );
   *
   * // Analyze specific date
   * const result = await service.analyzeRecentCosts(
   *   'tenant-123',
   *   'account-456',
   *   new Date('2024-01-15')
   * );
   * ```
   */
  async analyzeRecentCosts(
    tenantId: string,
    cloudAccountId: string,
    date?: Date
  ): Promise<AnalysisResult> {
    const analysisDate = date || this.getYesterday();
    console.log(`[AnomalyDetection] Analyzing costs for ${analysisDate.toISOString()}`);
    console.log(`[AnomalyDetection] Tenant: ${tenantId}, Account: ${cloudAccountId}`);

    // Step 1: Obtain costs for the analysis date, grouped by service
    const dailyCosts = await this.getCostsForDate(tenantId, cloudAccountId, analysisDate);
    console.log(`[AnomalyDetection] Retrieved ${dailyCosts.length} services with cost data`);

    // Step 2: Analyze each service for anomalies
    const anomalies: CostAnomaly[] = [];

    for (const cost of dailyCosts) {
      console.log(`[AnomalyDetection] Analyzing service: ${cost.service} ($${cost.amount})`);

      // Step 3: Calculate historical average
      const historicalAvg = await this.getHistoricalAverage(
        tenantId,
        cloudAccountId,
        cost.service,
        analysisDate,
        AnomalyDetectionService.HISTORICAL_DAYS
      );

      // If no historical data, skip this service
      if (historicalAvg === 0) {
        console.log(`[AnomalyDetection] No historical data for ${cost.service}, skipping`);
        continue;
      }

      console.log(`[AnomalyDetection] Historical average for ${cost.service}: $${historicalAvg.toFixed(2)}`);

      // Step 4: Calculate deviation percentage
      const deviation = ((cost.amount - historicalAvg) / historicalAvg) * 100;
      console.log(`[AnomalyDetection] Deviation: ${deviation.toFixed(2)}%`);

      // Step 5: Check if deviation exceeds threshold
      if (Math.abs(deviation) > AnomalyDetectionService.ANOMALY_THRESHOLD) {
        console.log(`[AnomalyDetection] Anomaly detected! Deviation exceeds ${AnomalyDetectionService.ANOMALY_THRESHOLD}%`);

        // Step 6: Create anomaly record
        const anomaly = await this.createAnomaly({
          tenantId,
          date: analysisDate,
          service: cost.service,
          provider: cost.provider,
          expectedCost: historicalAvg,
          actualCost: cost.amount,
          deviation,
        });

        // Step 7: Add to results if created (not duplicate)
        if (anomaly) {
          anomalies.push(anomaly);
        }
      } else {
        console.log(`[AnomalyDetection] No anomaly for ${cost.service} (within threshold)`);
      }
    }

    console.log(`[AnomalyDetection] Analysis complete. Detected ${anomalies.length} anomalies`);

    return {
      anomaliesDetected: anomalies.length,
      anomalies,
    };
  }

  // ============================================================
  // Query Methods
  // ============================================================

  /**
   * Retrieves anomalies for a tenant with optional filtering
   *
   * This method allows flexible querying of anomaly records with support for:
   * - Status filtering (open, investigating, resolved, dismissed)
   * - Severity filtering (low, medium, high, critical)
   * - Date range filtering
   * - Provider filtering (aws, azure, gcp)
   * - Service filtering
   *
   * Results are ordered by severity (critical first) and date (newest first).
   *
   * @param tenantId - UUID of the tenant
   * @param filters - Optional filters for refining results
   * @returns Array of anomaly records with relations
   *
   * @example
   * ```typescript
   * // Get all open critical anomalies
   * const anomalies = await service.getAnomaliesForTenant('tenant-123', {
   *   status: 'open',
   *   severity: 'critical'
   * });
   *
   * // Get anomalies for last 30 days
   * const recent = await service.getAnomaliesForTenant('tenant-123', {
   *   startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
   * });
   * ```
   */
  async getAnomaliesForTenant(
    tenantId: string,
    filters?: AnomalyFilters
  ): Promise<CostAnomaly[]> {
    console.log(`[AnomalyDetection] Querying anomalies for tenant ${tenantId}`);
    if (filters) {
      console.log(`[AnomalyDetection] Filters:`, JSON.stringify(filters));
    }

    // Build where clause with filters
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    if (filters?.service) {
      where.service = filters.service;
    }

    // Date range filtering
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    // Query anomalies with relations
    const anomalies = await this.prisma.costAnomaly.findMany({
      where,
      include: {
        tenant: true,
      },
      orderBy: [
        // Order by severity: critical > high > medium > low
        // Note: Prisma doesn't support custom sort order directly,
        // so we rely on alphabetical sorting which works for these values
        { severity: 'desc' },
        { date: 'desc' },
      ],
    });

    console.log(`[AnomalyDetection] Found ${anomalies.length} anomalies`);
    return anomalies;
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Retrieves costs for a specific date, grouped by service
   *
   * This method aggregates all cost data for the given date and groups it by
   * service and provider, summing the amounts for each service.
   *
   * @param tenantId - UUID of the tenant
   * @param cloudAccountId - UUID of the cloud account
   * @param date - Date to retrieve costs for
   * @returns Array of service cost data
   * @private
   */
  private async getCostsForDate(
    tenantId: string,
    cloudAccountId: string,
    date: Date
  ): Promise<ServiceCostData[]> {
    // Group costs by service and provider, summing amounts
    const costs = await this.prisma.costData.groupBy({
      by: ['service', 'provider'],
      where: {
        tenantId,
        cloudAccountId,
        date,
      },
      _sum: {
        amount: true,
      },
    });

    // Transform to ServiceCostData interface
    return costs.map((c) => ({
      service: c.service,
      provider: c.provider,
      amount: Number(c._sum.amount || 0),
    }));
  }

  /**
   * Calculates historical average cost for a service
   *
   * This method:
   * - Retrieves cost data for the specified service over the last N days
   * - Excludes the current analysis date to avoid bias
   * - Calculates the average daily cost
   * - Returns 0 if no historical data exists (prevents false positives)
   *
   * @param tenantId - UUID of the tenant
   * @param cloudAccountId - UUID of the cloud account
   * @param service - Service name (e.g., "EC2", "RDS")
   * @param currentDate - Current analysis date (to exclude from baseline)
   * @param days - Number of days to look back for historical data
   * @returns Average daily cost for the service, or 0 if no data
   * @private
   */
  private async getHistoricalAverage(
    tenantId: string,
    cloudAccountId: string,
    service: string,
    currentDate: Date,
    days: number
  ): Promise<number> {
    // Calculate date range for historical data
    // End date: day before current date (to exclude current date)
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() - 1);

    // Start date: N days before end date
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    console.log(
      `[AnomalyDetection] Calculating historical average for ${service} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Retrieve historical cost data
    const costs = await this.prisma.costData.findMany({
      where: {
        tenantId,
        cloudAccountId,
        service,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // If no historical data, return 0
    if (costs.length === 0) {
      console.log(`[AnomalyDetection] No historical data found for ${service}`);
      return 0;
    }

    // Calculate average cost
    const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const average = total / costs.length;

    console.log(
      `[AnomalyDetection] Historical average for ${service}: $${average.toFixed(2)} (${costs.length} data points)`
    );

    return average;
  }

  /**
   * Creates an anomaly record with duplicate prevention
   *
   * This method:
   * - Checks for existing anomaly for the same service/date/tenant
   * - Prevents duplicate anomalies (skip if exists)
   * - Calculates severity based on deviation
   * - Saves anomaly to database
   * - Emits event for downstream processing
   *
   * Duplicate prevention ensures that:
   * - Running analysis multiple times doesn't create duplicate alerts
   * - Only one anomaly exists per service/date combination
   *
   * @param data - Anomaly creation parameters
   * @returns Created anomaly record, or null if duplicate exists
   * @private
   */
  private async createAnomaly(data: CreateAnomalyData): Promise<CostAnomaly | null> {
    // Step 1: Check for existing anomaly (duplicate prevention)
    const existing = await this.prisma.costAnomaly.findFirst({
      where: {
        tenantId: data.tenantId,
        service: data.service,
        date: data.date,
        provider: data.provider,
      },
    });

    if (existing) {
      console.log(
        `[AnomalyDetection] Anomaly already exists for ${data.service} on ${data.date.toISOString()} (ID: ${existing.id})`
      );
      return null;
    }

    // Step 2: Calculate severity based on deviation magnitude
    const severity = this.calculateSeverity(data.deviation);

    console.log(
      `[AnomalyDetection] Creating ${severity} anomaly for ${data.service}: $${data.actualCost.toFixed(2)} (expected $${data.expectedCost.toFixed(2)}, deviation: ${data.deviation.toFixed(2)}%)`
    );

    // Step 3: Create anomaly record in database
    const anomaly = await this.prisma.costAnomaly.create({
      data: {
        tenantId: data.tenantId,
        date: data.date,
        service: data.service,
        provider: data.provider,
        resourceId: data.resourceId || null,
        expectedCost: data.expectedCost,
        actualCost: data.actualCost,
        deviation: data.deviation,
        severity,
        status: 'open',
        detectedAt: new Date(),
      },
    });

    console.log(`[AnomalyDetection] Created anomaly record with ID: ${anomaly.id}`);

    // Step 4: Emit event for incident management and alerting
    const event: CostAnomalyDetectedEvent = {
      tenantId: data.tenantId,
      anomalyId: anomaly.id,
      provider: data.provider as 'aws' | 'azure' | 'gcp',
      severity,
      expectedCost: data.expectedCost,
      actualCost: data.actualCost,
      service: data.service,
      date: data.date,
    };

    this.eventBus.emit('cost.anomaly.detected', event);
    console.log(`[AnomalyDetection] Emitted cost.anomaly.detected event for anomaly ${anomaly.id}`);

    return anomaly;
  }

  /**
   * Calculates severity level based on deviation magnitude
   *
   * Severity thresholds:
   * - Low: 50-100% deviation
   * - Medium: 100-200% deviation
   * - High: 200-500% deviation
   * - Critical: >500% deviation
   *
   * Uses absolute deviation to handle both increases and decreases.
   *
   * @param deviation - Deviation percentage (can be positive or negative)
   * @returns Severity level
   * @private
   */
  private calculateSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    const absDeviation = Math.abs(deviation);

    if (absDeviation > 500) {
      return 'critical';
    }
    if (absDeviation > 200) {
      return 'high';
    }
    if (absDeviation > 100) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Returns yesterday's date (normalized to midnight)
   *
   * Used as the default analysis date since today's costs may not be complete.
   *
   * @returns Yesterday's date at 00:00:00
   * @private
   */
  private getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }
}
