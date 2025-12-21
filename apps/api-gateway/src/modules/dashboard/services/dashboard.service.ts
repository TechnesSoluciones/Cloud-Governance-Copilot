/**
 * Dashboard Service
 * Aggregates data from multiple Azure services for the main dashboard
 *
 * Performance Optimization:
 * - Response caching with Redis (5 minute TTL)
 * - Automatic tenant isolation
 * - Cache invalidation on data updates
 */

import { AzureResourceGraphService } from '../../../services/azure/resourceGraph.service';
import { AzureCostManagementService } from '../../../services/azure/costManagement.service';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { cacheResponse, CachePresets } from '../../../lib/cache';
export interface DashboardOverview {
  resources: {
    total: number;
    byType: Array<{ type: string; count: number }>;
    byLocation: Array<{ location: string; count: number }>;
  };
  costs: {
    currentMonth: number;
    previousMonth: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
    topServices: Array<{ service: string; cost: number }>;
  };
  security: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
  };
  alerts: {
    active: number;
    recent: Array<{
      id: string;
      severity: string;
      message: string;
      timestamp: Date;
    }>;
  };
}

export interface HealthStatus {
  virtualMachines: {
    total: number;
    running: number;
    stopped: number;
    deallocated: number;
  };
  resourcesByLocation: Array<{
    location: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    timestamp: Date;
    resourceId: string;
    changeType: string;
    description: string;
  }>;
}

/**
 * Dashboard Service
 */
export class DashboardService {
  /**
   * Get dashboard overview data
   * Aggregates resources, costs, security, and alerts
   *
   * Performance: Cached for 5 minutes with automatic tenant isolation
   */
  static async getOverview(accountId: string): Promise<DashboardOverview> {
    return cacheResponse(
      `overview:${accountId}`,
      async () => {
        try {
          // Parallel fetch for performance
          const [resourceSummary, costData, securityData] = await Promise.all([
            this.getResourceSummary(accountId),
            this.getCostSummary(accountId),
            this.getSecuritySummary(accountId),
          ]);

          // Get recent alerts (last 7 days)
          const alerts = await this.getRecentAlerts(accountId, 7);

          return {
            resources: resourceSummary,
            costs: costData,
            security: securityData,
            alerts: {
              active: alerts.length,
              recent: alerts.slice(0, 5), // Top 5 most recent
            },
          };
        } catch (error: any) {
          console.error(`Failed to get dashboard overview for account ${accountId}:`, error);
          throw new Error(`Failed to load dashboard: ${error.message}`);
        }
      },
      CachePresets.DASHBOARD
    );
  }

  /**
   * Get health status for the account
   *
   * Performance: Cached for 5 minutes with automatic tenant isolation
   */
  static async getHealthStatus(accountId: string): Promise<HealthStatus> {
    return cacheResponse(
      `health:${accountId}`,
      async () => {
        try {
          const resourceSummary = await AzureResourceGraphService.getResourceSummary(accountId);
          const recentChanges = await AzureResourceGraphService.getRecentChanges(accountId);

          // Calculate percentages for locations
          const totalResources = resourceSummary.totalResources;
          const resourcesByLocation = resourceSummary.byLocation.map((loc) => ({
            location: loc.location,
            count: loc.count,
            percentage: totalResources > 0 ? (loc.count / totalResources) * 100 : 0,
          }));

          // Format recent activity
          const recentActivity = recentChanges.slice(0, 10).map((change: any) => ({
            timestamp: new Date(change.timestamp),
            resourceId: change.resourceId,
            changeType: change.changeType || 'Update',
            description: `${change.changeType || 'Update'} on ${change.resourceId.split('/').pop() || 'resource'}`,
          }));

          return {
            virtualMachines: {
              total: resourceSummary.virtualMachines.total,
              running: resourceSummary.virtualMachines.running,
              stopped: resourceSummary.virtualMachines.stopped,
              deallocated: resourceSummary.virtualMachines.total - resourceSummary.virtualMachines.running,
            },
            resourcesByLocation: resourcesByLocation.slice(0, 5), // Top 5 locations
            recentActivity,
          };
        } catch (error: any) {
          console.error(`Failed to get health status for account ${accountId}:`, error);
          throw new Error(`Failed to load health status: ${error.message}`);
        }
      },
      CachePresets.DASHBOARD
    );
  }

  /**
   * Private helper: Get resource summary
   */
  private static async getResourceSummary(accountId: string) {
    const summary = await AzureResourceGraphService.getResourceSummary(accountId);

    return {
      total: summary.totalResources,
      byType: summary.byType.slice(0, 10), // Top 10 types
      byLocation: summary.byLocation.slice(0, 5), // Top 5 locations
    };
  }

  /**
   * Private helper: Get cost summary
   */
  private static async getCostSummary(accountId: string) {
    try {
      return await AzureCostManagementService.getCostSummary(accountId);
    } catch (error: any) {
      console.warn('Failed to get cost summary, returning defaults:', error.message);
      return {
        currentMonth: 0,
        previousMonth: 0,
        trend: 'stable' as const,
        percentageChange: 0,
        topServices: [],
      };
    }
  }

  /**
   * Private helper: Get security summary
   */
  private static async getSecuritySummary(accountId: string) {
    try {
      // Get account and tenant info
      const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
        include: { tenant: true },
      });

      if (!account || !account.tenantId) {
        throw new Error('Account or tenant not found');
      }

      // Get latest security score from database
      const latestScore = await prisma.$queryRaw<any[]>`
        SELECT current_score, max_score, percentage
        FROM azure_security_scores
        WHERE tenant_id = ${account.tenantId}
        AND score_type = 'overall'
        ORDER BY scored_at DESC
        LIMIT 1
      `;

      const score = latestScore.length > 0 ? Number(latestScore[0].percentage) : 0;

      // Count security issues by severity
      const issues = await prisma.$queryRaw<any[]>`
        SELECT
          severity,
          COUNT(*) as count
        FROM azure_security_assessments
        WHERE tenant_id = ${account.tenantId}
        AND status = 'Unhealthy'
        GROUP BY severity
      `;

      const criticalIssues = issues.find((i) => i.severity === 'Critical')?.count || 0;
      const highIssues = issues.find((i) => i.severity === 'High')?.count || 0;
      const mediumIssues = issues.find((i) => i.severity === 'Medium')?.count || 0;

      return {
        score: Math.round(score * 100) / 100,
        criticalIssues: Number(criticalIssues),
        highIssues: Number(highIssues),
        mediumIssues: Number(mediumIssues),
      };
    } catch (error: any) {
      console.warn('Failed to get security summary, returning defaults:', error.message);
      return {
        score: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
      };
    }
  }

  /**
   * Private helper: Get recent alerts
   */
  private static async getRecentAlerts(accountId: string, days: number = 7) {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
        include: { tenant: true },
      });

      if (!account || !account.tenantId) {
        return [];
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get recent security assessments marked as unhealthy
      const alerts = await prisma.$queryRaw<any[]>`
        SELECT
          id::text,
          severity,
          display_name as message,
          assessed_at as timestamp
        FROM azure_security_assessments
        WHERE tenant_id = ${account.tenantId}
        AND status = 'Unhealthy'
        AND assessed_at >= ${cutoffDate}
        ORDER BY assessed_at DESC
        LIMIT 20
      `;

      return alerts.map((alert) => ({
        id: alert.id,
        severity: alert.severity || 'Medium',
        message: alert.message || 'Security issue detected',
        timestamp: new Date(alert.timestamp),
      }));
    } catch (error: any) {
      console.warn('Failed to get recent alerts:', error.message);
      return [];
    }
  }
}
