/**
 * Incidents Controller
 *
 * HTTP request handlers for incident management endpoints
 *
 * Features:
 * - Input validation
 * - Authentication middleware integration
 * - Response formatting
 * - Pagination support
 * - Error handling
 *
 * @module modules/incidents/controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { IncidentsService } from '../services/incidents.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';
import { AlertFilters, TimeRange } from '../dto/alert.dto';
import { ActivityLogFilters } from '../dto/activity-log.dto';
import { IncidentFilters, UpdateIncidentStatusDto, AddCommentDto } from '../dto/incident.dto';

const prisma = new PrismaClient();
const incidentsService = new IncidentsService(prisma);

/**
 * Gets alerts with filtering
 *
 * GET /api/v1/incidents/alerts
 * Query params: accountId, severity, status, resourceType, startDate, endDate
 */
export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, severity, status, resourceType, startDate, endDate, page = '1', pageSize = '50' } = req.query;

    if (!accountId) {
      res.status(400).json({ error: 'accountId is required' });
      return;
    }

    // Get cloud account credentials
    const cloudAccount = await prisma.$queryRaw<any[]>`
      SELECT * FROM cloud_accounts
      WHERE account_id = ${accountId as string}::uuid
      LIMIT 1
    `;

    if (!cloudAccount || cloudAccount.length === 0) {
      res.status(404).json({ error: 'Cloud account not found' });
      return;
    }

    const account = cloudAccount[0];
    const credentials = await decryptCredentials(account);

    // Build filters
    const filters: AlertFilters = {};

    if (severity) {
      filters.severity = (severity as string).split(',') as any;
    }

    if (status) {
      filters.status = (status as string).split(',') as any;
    }

    if (resourceType) {
      filters.resourceType = resourceType as string;
    }

    if (startDate && endDate) {
      filters.timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };
    }

    const alerts = await incidentsService.getAlerts(accountId as string, credentials, filters);

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const startIdx = (pageNum - 1) * pageSizeNum;
    const endIdx = startIdx + pageSizeNum;
    const paginatedAlerts = alerts.slice(startIdx, endIdx);

    res.json({
      alerts: paginatedAlerts,
      total: alerts.length,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: endIdx < alerts.length,
    });
  } catch (error) {
    console.error('[IncidentsController] Error getting alerts:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets activity logs with filtering
 *
 * GET /api/v1/incidents/activity-logs
 * Query params: accountId, startDate, endDate, status, level, operationName
 */
export async function getActivityLogs(req: Request, res: Response): Promise<void> {
  try {
    const {
      accountId,
      startDate,
      endDate,
      status,
      level,
      operationName,
      page = '1',
      pageSize = '100',
    } = req.query;

    if (!accountId || !startDate || !endDate) {
      res.status(400).json({ error: 'accountId, startDate, and endDate are required' });
      return;
    }

    // Get cloud account credentials
    const cloudAccount = await prisma.$queryRaw<any[]>`
      SELECT * FROM cloud_accounts
      WHERE account_id = ${accountId as string}::uuid
      LIMIT 1
    `;

    if (!cloudAccount || cloudAccount.length === 0) {
      res.status(404).json({ error: 'Cloud account not found' });
      return;
    }

    const account = cloudAccount[0];
    const credentials = await decryptCredentials(account);

    // Build filters
    const filters: ActivityLogFilters = {
      timeRange: {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      },
    };

    if (status) {
      filters.status = (status as string).split(',') as any;
    }

    if (level) {
      filters.level = (level as string).split(',') as any;
    }

    if (operationName) {
      filters.operationName = operationName as string;
    }

    const logs = await incidentsService.getActivityLogs(accountId as string, credentials, filters);

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const startIdx = (pageNum - 1) * pageSizeNum;
    const endIdx = startIdx + pageSizeNum;
    const paginatedLogs = logs.slice(startIdx, endIdx);

    res.json({
      logs: paginatedLogs,
      total: logs.length,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: endIdx < logs.length,
    });
  } catch (error) {
    console.error('[IncidentsController] Error getting activity logs:', error);
    res.status(500).json({
      error: 'Failed to get activity logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets incidents with filtering
 *
 * GET /api/v1/incidents
 * Query params: accountId, status, severity, assignedTo
 */
export async function getIncidents(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, status, severity, assignedTo, page = '1', pageSize = '20' } = req.query;
    const tenantId = (req as any).user?.tenantId;

    if (!accountId) {
      res.status(400).json({ error: 'accountId is required' });
      return;
    }

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Build filters
    const filters: IncidentFilters = {};

    if (status) {
      filters.status = (status as string).split(',') as any;
    }

    if (severity) {
      filters.severity = (severity as string).split(',') as any;
    }

    if (assignedTo) {
      filters.assignedTo = assignedTo as string;
    }

    const incidents = await incidentsService.getIncidents(
      tenantId,
      accountId as string,
      filters
    );

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const startIdx = (pageNum - 1) * pageSizeNum;
    const endIdx = startIdx + pageSizeNum;
    const paginatedIncidents = incidents.slice(startIdx, endIdx);

    res.json({
      incidents: paginatedIncidents,
      total: incidents.length,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: endIdx < incidents.length,
    });
  } catch (error) {
    console.error('[IncidentsController] Error getting incidents:', error);
    res.status(500).json({
      error: 'Failed to get incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets incident by ID with full details
 *
 * GET /api/v1/incidents/:id
 */
export async function getIncidentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const incident = await incidentsService.getIncidentById(tenantId, id);

    res.json(incident);
  } catch (error) {
    console.error('[IncidentsController] Error getting incident:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(500).json({
      error: 'Failed to get incident',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Updates incident status
 *
 * PATCH /api/v1/incidents/:id/status
 * Body: { status, notes?, assignedTo? }
 */
export async function updateIncidentStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId;
    const dto: UpdateIncidentStatusDto = req.body;

    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate status
    const validStatuses = ['new', 'acknowledged', 'investigating', 'resolved', 'closed'];
    if (!dto.status || !validStatuses.includes(dto.status)) {
      res.status(400).json({
        error: 'Invalid status',
        validStatuses,
      });
      return;
    }

    const incident = await incidentsService.updateIncidentStatus(tenantId, id, dto);

    res.json(incident);
  } catch (error) {
    console.error('[IncidentsController] Error updating incident status:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.status(500).json({
      error: 'Failed to update incident status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Adds comment to incident
 *
 * POST /api/v1/incidents/:id/comments
 * Body: { comment, userId }
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const dto: AddCommentDto = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!dto.comment || dto.comment.trim().length === 0) {
      res.status(400).json({ error: 'Comment is required' });
      return;
    }

    // Override userId from token
    dto.userId = userId;

    const comment = await incidentsService.addComment(id, dto);

    res.status(201).json(comment);
  } catch (error) {
    console.error('[IncidentsController] Error adding comment:', error);

    res.status(500).json({
      error: 'Failed to add comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Gets metrics for a specific resource
 *
 * GET /api/v1/incidents/metrics/:resourceId
 * Query params: metricNames (comma-separated), startDate, endDate, aggregation, interval
 */
export async function getResourceMetrics(req: Request, res: Response): Promise<void> {
  try {
    const { resourceId } = req.params;
    const {
      accountId,
      metricNames,
      startDate,
      endDate,
      aggregation = 'Average',
      interval = 'PT5M',
    } = req.query;

    if (!accountId || !metricNames || !startDate || !endDate) {
      res.status(400).json({
        error: 'accountId, metricNames, startDate, and endDate are required',
      });
      return;
    }

    // Get cloud account credentials
    const cloudAccount = await prisma.$queryRaw<any[]>`
      SELECT * FROM cloud_accounts
      WHERE account_id = ${accountId as string}::uuid
      LIMIT 1
    `;

    if (!cloudAccount || cloudAccount.length === 0) {
      res.status(404).json({ error: 'Cloud account not found' });
      return;
    }

    const account = cloudAccount[0];
    const credentials = await decryptCredentials(account);

    // Import AzureMonitorService
    const { AzureMonitorService } = await import('../../../integrations/azure/monitor.service');
    const monitorService = new AzureMonitorService(credentials);

    const metrics = await monitorService.getResourceMetrics(
      resourceId,
      (metricNames as string).split(','),
      {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      },
      aggregation as any,
      interval as string
    );

    res.json({ metrics });
  } catch (error) {
    console.error('[IncidentsController] Error getting metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Decrypts cloud account credentials
 */
async function decryptCredentials(account: any): Promise<CloudProviderCredentials> {
  // Import decryption utility
  const { decryptCloudCredentials } = await import('../../../utils/encryption');

  const decrypted = await decryptCloudCredentials(
    account.credentials_ciphertext,
    account.credentials_iv,
    account.credentials_auth_tag
  );

  return {
    provider: account.provider,
    azureClientId: decrypted.azureClientId,
    azureClientSecret: decrypted.azureClientSecret,
    azureTenantId: decrypted.azureTenantId,
    azureSubscriptionId: decrypted.azureSubscriptionId,
  };
}
