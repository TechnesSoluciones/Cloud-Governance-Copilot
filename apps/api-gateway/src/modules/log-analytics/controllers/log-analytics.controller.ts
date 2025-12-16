/**
 * Log Analytics Controller
 *
 * REST API controller for executing KQL queries and managing saved queries.
 * Provides endpoints for custom queries, pre-built queries, and query history.
 *
 * Endpoints:
 * - POST   /api/v1/log-analytics/query          - Execute custom query
 * - GET    /api/v1/log-analytics/prebuilt/:name - Execute pre-built query
 * - GET    /api/v1/log-analytics/history        - Get query history
 * - POST   /api/v1/log-analytics/save           - Save query
 * - DELETE /api/v1/log-analytics/queries/:id    - Delete saved query
 *
 * @module log-analytics/controllers
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { LogAnalyticsManagementService } from '../services/log-analytics-management.service';
import {
  executeQuerySchema,
  getPreBuiltQuerySchema,
  getQueryHistorySchema,
  saveQuerySchema,
  QueryResultResponse,
  SavedQueryResponse,
  PreBuiltQueryInfo,
} from '../dto/log-analytics.dto';
import { PreBuiltQueryName } from '../../../integrations/azure/log-analytics.service';

/**
 * Extended Express Request with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

/**
 * Pre-built query metadata
 */
const PRE_BUILT_QUERIES: Record<string, PreBuiltQueryInfo> = {
  failed_operations: {
    name: 'Failed Operations',
    description: 'Lists failed Azure operations in the last 24 hours',
    defaultTimespan: '24h',
    category: 'operations',
  },
  high_cpu_alerts: {
    name: 'High CPU Alerts',
    description: 'VMs with CPU usage exceeding 80% in the last hour',
    defaultTimespan: '24h',
    category: 'performance',
  },
  network_errors: {
    name: 'Network Errors',
    description: 'Network security group blocks in the last 24 hours',
    defaultTimespan: '24h',
    category: 'network',
  },
  security_events: {
    name: 'Security Events',
    description: 'Login events (successful, failed, privileged) in the last 24 hours',
    defaultTimespan: '24h',
    category: 'security',
  },
  resource_changes: {
    name: 'Resource Changes',
    description: 'Resource creation, modification, and deletion in the last 7 days',
    defaultTimespan: '7d',
    category: 'operations',
  },
};

/**
 * Log Analytics Controller
 *
 * @example
 * ```typescript
 * const controller = new LogAnalyticsController();
 * router.post('/log-analytics/query', controller.executeQuery.bind(controller));
 * ```
 */
export class LogAnalyticsController {
  private service: LogAnalyticsManagementService;

  constructor() {
    this.service = new LogAnalyticsManagementService();
  }

  /**
   * POST /api/v1/log-analytics/query
   *
   * Executes a custom KQL query.
   *
   * Request Body:
   * ```json
   * {
   *   "accountId": "uuid",
   *   "workspaceId": "workspace-id",
   *   "query": "AzureActivity | where TimeGenerated > ago(24h)",
   *   "timespan": {
   *     "type": "24h"
   *   },
   *   "timeout": 30,
   *   "maxRows": 1000
   * }
   * ```
   */
  executeQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const body = executeQuerySchema.parse(req.body);

      // Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(
        `[LogAnalyticsController] executeQuery - Account: ${body.accountId}, Workspace: ${body.workspaceId}`
      );

      // Convert timespan
      const timespan = {
        type: body.timespan.type as any,
        start: body.timespan.start ? new Date(body.timespan.start) : undefined,
        end: body.timespan.end ? new Date(body.timespan.end) : undefined,
      };

      // Execute query
      const result = await this.service.executeQuery(
        body.accountId,
        tenantId,
        body.workspaceId,
        body.query,
        timespan,
        {
          timeout: body.timeout,
          maxRows: body.maxRows,
        }
      );

      // Transform to response format
      const data: QueryResultResponse = {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        status: result.status,
        error: result.error,
      };

      console.log(
        `[LogAnalyticsController] executeQuery - Status: ${data.status}, Rows: ${data.rowCount}, Time: ${data.executionTime}ms`
      );

      res.json({
        success: data.status !== 'failed',
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'executeQuery');
    }
  };

  /**
   * GET /api/v1/log-analytics/prebuilt/:queryName
   *
   * Executes a pre-built KQL query.
   *
   * Query Parameters:
   * - accountId (required): Cloud account UUID
   * - workspaceId (required): Log Analytics workspace ID
   * - params (optional): Query parameters (JSON object)
   */
  getPreBuiltQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Extract query name from URL
      const queryName = req.params.queryName as PreBuiltQueryName;

      if (!PRE_BUILT_QUERIES[queryName]) {
        res.status(404).json({
          success: false,
          error: `Unknown pre-built query: ${queryName}`,
        });
        return;
      }

      // Validate query parameters
      const params = getPreBuiltQuerySchema.parse(req.query);

      // Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(
        `[LogAnalyticsController] getPreBuiltQuery - Query: ${queryName}, Account: ${params.accountId}`
      );

      // Execute pre-built query
      const result = await this.service.executePreBuiltQuery(
        params.accountId,
        tenantId,
        params.workspaceId,
        queryName,
        params.params
      );

      // Transform to response format
      const data: QueryResultResponse = {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        status: result.status,
        error: result.error,
      };

      console.log(
        `[LogAnalyticsController] getPreBuiltQuery - Status: ${data.status}, Rows: ${data.rowCount}`
      );

      res.json({
        success: data.status !== 'failed',
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getPreBuiltQuery');
    }
  };

  /**
   * GET /api/v1/log-analytics/prebuilt
   *
   * Lists all available pre-built queries.
   */
  listPreBuiltQueries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const queries = Object.entries(PRE_BUILT_QUERIES).map(([key, value]) => ({
        id: key,
        ...value,
      }));

      res.json({
        success: true,
        data: queries,
      });
    } catch (error) {
      this.handleError(error, res, 'listPreBuiltQueries');
    }
  };

  /**
   * GET /api/v1/log-analytics/history
   *
   * Gets saved query history.
   *
   * Query Parameters:
   * - accountId (required): Cloud account UUID
   */
  getQueryHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate query parameters
      const params = getQueryHistorySchema.parse(req.query);

      // Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[LogAnalyticsController] getQueryHistory - Account: ${params.accountId}`);

      // Fetch query history
      const queries = await this.service.getQueryHistory(params.accountId, tenantId);

      // Transform to response format
      const data: SavedQueryResponse[] = queries.map((q) => ({
        id: q.id,
        tenantId: q.tenantId,
        accountId: q.accountId,
        name: q.name,
        query: q.query,
        description: q.description,
        createdBy: q.createdBy,
        lastExecuted: q.lastExecuted?.toISOString(),
        executionCount: q.executionCount,
        createdAt: q.createdAt.toISOString(),
      }));

      console.log(`[LogAnalyticsController] getQueryHistory - Retrieved ${data.length} queries`);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getQueryHistory');
    }
  };

  /**
   * POST /api/v1/log-analytics/save
   *
   * Saves a query for future use.
   *
   * Request Body:
   * ```json
   * {
   *   "accountId": "uuid",
   *   "name": "My Query",
   *   "query": "AzureActivity | summarize count()",
   *   "description": "Count all activities"
   * }
   * ```
   */
  saveQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const body = saveQuerySchema.parse(req.body);

      // Extract tenantId and userId from authenticated user
      if (!req.user?.tenantId || !req.user?.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.userId;

      console.log(
        `[LogAnalyticsController] saveQuery - Name: ${body.name}, Account: ${body.accountId}`
      );

      // Save query
      const savedQuery = await this.service.saveQuery(
        body.accountId,
        tenantId,
        userId,
        body.name,
        body.query,
        body.description
      );

      // Transform to response format
      const data: SavedQueryResponse = {
        id: savedQuery.id,
        tenantId: savedQuery.tenantId,
        accountId: savedQuery.accountId,
        name: savedQuery.name,
        query: savedQuery.query,
        description: savedQuery.description,
        createdBy: savedQuery.createdBy,
        lastExecuted: savedQuery.lastExecuted?.toISOString(),
        executionCount: savedQuery.executionCount,
        createdAt: savedQuery.createdAt.toISOString(),
      };

      console.log(`[LogAnalyticsController] saveQuery - Saved query: ${data.id}`);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'saveQuery');
    }
  };

  /**
   * DELETE /api/v1/log-analytics/queries/:id
   *
   * Deletes a saved query.
   */
  deleteQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Extract query ID from URL
      const queryId = req.params.id;

      if (!queryId) {
        res.status(400).json({
          success: false,
          error: 'Query ID is required',
        });
        return;
      }

      // Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[LogAnalyticsController] deleteQuery - Query: ${queryId}`);

      // Delete query
      await this.service.deleteQuery(queryId, tenantId);

      console.log(`[LogAnalyticsController] deleteQuery - Deleted query: ${queryId}`);

      res.json({
        success: true,
        message: 'Query deleted successfully',
      });
    } catch (error) {
      this.handleError(error, res, 'deleteQuery');
    }
  };

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Centralized error handling
   */
  private handleError(error: any, res: Response, method: string): void {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error(`[LogAnalyticsController] ${method} - Validation error:`, error.errors);
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

    // Log internal errors
    console.error(`[LogAnalyticsController] ${method} - Error:`, error);

    // Handle specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found')) {
      res.status(404).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    if (errorMessage.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    if (errorMessage.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
    });
  }
}

/**
 * Singleton instance
 */
export const logAnalyticsController = new LogAnalyticsController();
