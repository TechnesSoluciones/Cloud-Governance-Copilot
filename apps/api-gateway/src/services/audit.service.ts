import { PrismaClient } from '@prisma/client';
import { AuditLogEntry, AuditLogFilter, AuditLogResult, AuditEventType, AuditSeverity } from '../types/audit.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Audit Service
 * Handles all audit logging operations
 */
class AuditService {
  /**
   * Create a new audit log entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: {
            ...entry.metadata,
            severity: entry.severity || AuditSeverity.INFO,
            success: entry.success !== undefined ? entry.success : true,
            errorMessage: entry.errorMessage,
          },
        },
      });

      // Also log to application logger for critical events
      if (entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.ERROR) {
        logger.warn('Audit event logged', {
          action: entry.action,
          userId: entry.userId,
          tenantId: entry.tenantId,
          severity: entry.severity,
        });
      }
    } catch (error: any) {
      // Don't throw - audit logging should never break the main flow
      logger.error('Failed to create audit log', {
        error: error.message,
        entry,
      });
    }
  }

  /**
   * Create multiple audit log entries in batch
   */
  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    try {
      await prisma.auditLog.createMany({
        data: entries.map((entry) => ({
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: {
            ...entry.metadata,
            severity: entry.severity || AuditSeverity.INFO,
            success: entry.success !== undefined ? entry.success : true,
            errorMessage: entry.errorMessage,
          },
        })),
      });
    } catch (error: any) {
      logger.error('Failed to create batch audit logs', {
        error: error.message,
        count: entries.length,
      });
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(filter: AuditLogFilter): Promise<AuditLogResult> {
    try {
      const where: any = {
        tenantId: filter.tenantId,
      };

      if (filter.userId) {
        where.userId = filter.userId;
      }

      if (filter.action) {
        if (Array.isArray(filter.action)) {
          where.action = { in: filter.action };
        } else {
          where.action = filter.action;
        }
      }

      if (filter.resourceType) {
        where.resourceType = filter.resourceType;
      }

      if (filter.resourceId) {
        where.resourceId = filter.resourceId;
      }

      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) {
          where.createdAt.gte = filter.startDate;
        }
        if (filter.endDate) {
          where.createdAt.lte = filter.endDate;
        }
      }

      if (filter.severity) {
        where.metadata = {
          path: ['severity'],
          equals: filter.severity,
        };
      }

      if (filter.success !== undefined) {
        where.metadata = {
          ...where.metadata,
          path: ['success'],
          equals: filter.success,
        };
      }

      const limit = filter.limit || 100;
      const offset = filter.offset || 0;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs.map(this.formatLogEntry),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error: any) {
      logger.error('Failed to query audit logs', {
        error: error.message,
        filter,
      });
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const where: any = { tenantId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [total, byAction, bySeverity, failureCount] = await Promise.all([
        // Total logs
        prisma.auditLog.count({ where }),

        // Group by action
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),

        // Count by severity (from metadata JSON field)
        prisma.auditLog.findMany({
          where,
          select: { metadata: true },
        }),

        // Failed operations
        prisma.auditLog.count({
          where: {
            ...where,
            metadata: {
              path: ['success'],
              equals: false,
            },
          },
        }),
      ]);

      // Process severity counts from metadata
      const severityCounts: Record<string, number> = {};
      bySeverity.forEach((log: any) => {
        const severity = log.metadata?.severity || 'INFO';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      return {
        total,
        failureCount,
        successRate: total > 0 ? ((total - failureCount) / total) * 100 : 100,
        topActions: byAction.map((item: any) => ({
          action: item.action,
          count: item._count.action,
        })),
        severityCounts,
      };
    } catch (error: any) {
      logger.error('Failed to get audit statistics', {
        error: error.message,
        tenantId,
      });
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Delete old audit logs (for cleanup/retention policies)
   */
  async deleteOldLogs(tenantId: string, olderThan: Date): Promise<number> {
    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          tenantId,
          createdAt: { lt: olderThan },
        },
      });

      logger.info('Deleted old audit logs', {
        tenantId,
        count: result.count,
        olderThan,
      });

      return result.count;
    } catch (error: any) {
      logger.error('Failed to delete old audit logs', {
        error: error.message,
        tenantId,
      });
      throw new Error('Failed to delete old audit logs');
    }
  }

  /**
   * Format audit log entry for API response
   */
  private formatLogEntry(log: any): AuditLogEntry {
    return {
      tenantId: log.tenantId,
      userId: log.userId,
      action: log.action as AuditEventType,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      severity: log.metadata?.severity,
      success: log.metadata?.success,
      errorMessage: log.metadata?.errorMessage,
      metadata: log.metadata,
    };
  }

  /**
   * Helper: Log authentication event
   */
  async logAuth(
    action: AuditEventType,
    tenantId: string,
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      ipAddress,
      userAgent,
      success,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Helper: Log resource operation
   */
  async logResourceOperation(
    action: AuditEventType,
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      resourceType: resourceType as any,
      resourceId,
      ipAddress,
      severity: AuditSeverity.INFO,
      success: true,
      metadata,
    });
  }

  /**
   * Helper: Log security event
   */
  async logSecurityEvent(
    action: AuditEventType,
    tenantId: string,
    userId: string | undefined,
    severity: AuditSeverity,
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      severity,
      ipAddress,
      success: true,
      metadata: {
        ...metadata,
        category: 'security',
      },
    });
  }
}

export default new AuditService();
