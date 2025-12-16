/**
 * Service Health Controller
 *
 * REST API endpoints for Azure Service Health monitoring
 *
 * @module modules/service-health/controllers
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ServiceHealthModuleService } from '../services/service-health.service';
import type {
  ServiceHealthQueryParams,
  HealthHistoryQueryParams,
  MaintenanceQueryParams,
} from '../types';

const router = Router();
const prisma = new PrismaClient();
const serviceHealthService = new ServiceHealthModuleService(prisma);

/**
 * @route   GET /api/v1/service-health/status
 * @desc    Get current service health status
 * @access  Private
 * @query   accountId - Cloud account ID (required)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query as ServiceHealthQueryParams;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const status = await serviceHealthService.getServiceHealth(tenantId, accountId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting service health status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service health status',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/issues
 * @desc    Get active service issues
 * @access  Private
 * @query   accountId - Cloud account ID (required)
 * @query   impactType - Filter by impact type (optional)
 */
router.get('/issues', async (req: Request, res: Response) => {
  try {
    const { accountId, impactType } = req.query as ServiceHealthQueryParams;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const issues = await serviceHealthService.getServiceIssues(
      tenantId,
      accountId,
      impactType as 'Incident' | 'Informational' | 'ActionRequired' | undefined
    );

    res.json({
      success: true,
      data: issues,
      count: issues.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting service issues:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service issues',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/maintenance
 * @desc    Get planned maintenance events
 * @access  Private
 * @query   accountId - Cloud account ID (required)
 * @query   days - Number of days to look ahead (optional, default: 30)
 */
router.get('/maintenance', async (req: Request, res: Response) => {
  try {
    const { accountId, days } = req.query as MaintenanceQueryParams;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const daysAhead = days ? parseInt(String(days), 10) : 30;
    const maintenance = await serviceHealthService.getPlannedMaintenance(
      tenantId,
      accountId,
      daysAhead
    );

    res.json({
      success: true,
      data: maintenance,
      count: maintenance.length,
      daysAhead,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting planned maintenance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get planned maintenance',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/history
 * @desc    Get health event history
 * @access  Private
 * @query   accountId - Cloud account ID (required)
 * @query   days - Number of days of history (optional, default: 30)
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { accountId, days } = req.query as HealthHistoryQueryParams;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const daysBack = days ? parseInt(String(days), 10) : 30;
    const history = await serviceHealthService.getHealthHistory(tenantId, accountId, daysBack);

    res.json({
      success: true,
      data: history,
      count: history.length,
      daysBack,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting health history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get health history',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/resource/:resourceId
 * @desc    Get health status for a specific resource
 * @access  Private
 * @query   accountId - Cloud account ID (required)
 * @param   resourceId - Azure resource ID
 */
router.get('/resource/:resourceId(*)', async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { accountId } = req.query as ServiceHealthQueryParams;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: 'resourceId is required',
      });
    }

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Decode resource ID (it might be URL encoded)
    const decodedResourceId = decodeURIComponent(resourceId);

    const resourceHealth = await serviceHealthService.getResourceHealth(
      tenantId,
      accountId,
      decodedResourceId
    );

    res.json({
      success: true,
      data: resourceHealth,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting resource health:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get resource health',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/stats
 * @desc    Get service health statistics
 * @access  Private
 * @query   accountId - Cloud account ID (optional, for all accounts if not specified)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query as ServiceHealthQueryParams;

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const stats = await serviceHealthService.getServiceHealthStats(tenantId, accountId);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting service health stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service health stats',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/cached-events
 * @desc    Get cached service health events from database
 * @access  Private
 * @query   accountId - Cloud account ID (optional)
 * @query   eventType - Event type filter (optional)
 * @query   status - Status filter (optional)
 * @query   severity - Severity filter (optional)
 * @query   limit - Limit results (optional, default: 50)
 */
router.get('/cached-events', async (req: Request, res: Response) => {
  try {
    const { accountId, eventType, status, severity, limit } = req.query;

    // Get tenant ID from authenticated user
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const events = await serviceHealthService.getCachedServiceHealthEvents(
      tenantId,
      accountId as string | undefined,
      {
        eventType: eventType as string | undefined,
        status: status as string | undefined,
        severity: severity as string | undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      }
    );

    res.json({
      success: true,
      data: events,
      count: events.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting cached events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cached events',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/notifications
 * @desc    Get user notifications
 * @access  Private
 * @query   type - Notification type filter (optional)
 * @query   read - Read status filter (optional)
 * @query   archived - Archived status filter (optional)
 * @query   limit - Limit results (optional, default: 50)
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { type, read, archived, limit } = req.query;

    // Get user and tenant ID from authenticated user
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const notifications = await serviceHealthService.getNotifications(tenantId, userId, {
      type: type as string | undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notifications',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   POST /api/v1/service-health/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 * @param   id - Notification ID
 */
router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get user and tenant ID from authenticated user
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    await serviceHealthService.markNotificationAsRead(tenantId, userId, id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   POST /api/v1/service-health/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    // Get user and tenant ID from authenticated user
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    await serviceHealthService.markAllNotificationsAsRead(tenantId, userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   GET /api/v1/service-health/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    // Get user and tenant ID from authenticated user
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const preferences = await serviceHealthService.getNotificationPreferences(tenantId, userId);

    res.json({
      success: true,
      data: preferences,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification preferences',
      timestamp: new Date(),
    });
  }
});

/**
 * @route   PUT /api/v1/service-health/preferences
 * @desc    Update notification preferences
 * @access  Private
 * @body    Notification preferences object
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    // Get user and tenant ID from authenticated user
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    await serviceHealthService.updateNotificationPreferences(tenantId, userId, req.body);

    res.json({
      success: true,
      message: 'Notification preferences updated',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[ServiceHealthController] Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update notification preferences',
      timestamp: new Date(),
    });
  }
});

export default router;
