/**
 * Alert Rules Controller
 *
 * REST API controller for managing alert rules across cloud providers.
 * Provides endpoints for CRUD operations and template management.
 *
 * Endpoints:
 * - GET    /api/v1/alert-rules             - List alert rules
 * - POST   /api/v1/alert-rules             - Create alert rule
 * - PUT    /api/v1/alert-rules/:id         - Update alert rule
 * - DELETE /api/v1/alert-rules/:id         - Delete alert rule
 * - GET    /api/v1/alert-rules/templates   - List alert rule templates
 *
 * @module alert-rules/controllers
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { AlertRulesManagementService } from '../services/alert-rules-management.service';
import {
  getAlertRulesQuerySchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
  AlertRuleResponse,
  AlertRuleTemplateResponse,
} from '../dto/alert-rule.dto';

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
 * Alert Rules Controller
 *
 * @example
 * ```typescript
 * const controller = new AlertRulesController();
 * router.get('/alert-rules', controller.getAlertRules.bind(controller));
 * ```
 */
export class AlertRulesController {
  private service: AlertRulesManagementService;

  constructor() {
    this.service = new AlertRulesManagementService();
  }

  /**
   * GET /api/v1/alert-rules
   *
   * Lists all alert rules for a cloud account.
   *
   * Query Parameters:
   * - accountId (required): Cloud account UUID
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "/subscriptions/.../alertrules/...",
   *       "name": "High CPU Alert",
   *       "type": "metric",
   *       "enabled": true,
   *       "severity": 2,
   *       "targetResourceId": "/subscriptions/.../virtualMachines/vm1",
   *       "condition": "...",
   *       "actionGroups": [...],
   *       "evaluationFrequency": "PT5M",
   *       "windowSize": "PT15M",
   *       "autoMitigate": true
   *     }
   *   ]
   * }
   * ```
   */
  getAlertRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate query parameters
      const params = getAlertRulesQuerySchema.parse(req.query);

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
        `[AlertRulesController] getAlertRules - Account: ${params.accountId}, Tenant: ${tenantId}`
      );

      // Fetch alert rules
      const rules = await this.service.getAlertRules(params.accountId, tenantId);

      // Transform to response format
      const data: AlertRuleResponse[] = rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        description: rule.description,
        enabled: rule.enabled,
        severity: rule.severity,
        targetResourceId: rule.targetResourceId,
        condition: rule.condition,
        actionGroups: rule.actionGroups,
        evaluationFrequency: rule.evaluationFrequency,
        windowSize: rule.windowSize,
        autoMitigate: rule.autoMitigate,
        createdAt: rule.createdAt?.toISOString(),
        updatedAt: rule.updatedAt?.toISOString(),
      }));

      console.log(`[AlertRulesController] getAlertRules - Retrieved ${data.length} rules`);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getAlertRules');
    }
  };

  /**
   * POST /api/v1/alert-rules
   *
   * Creates a new alert rule.
   *
   * Request Body:
   * ```json
   * {
   *   "accountId": "uuid",
   *   "name": "High CPU Alert",
   *   "description": "Alert when CPU exceeds 80%",
   *   "enabled": true,
   *   "severity": 2,
   *   "targetResourceId": "/subscriptions/.../virtualMachines/vm1",
   *   "resourceGroupName": "my-rg",
   *   "condition": {
   *     "type": "metric",
   *     "metricName": "Percentage CPU",
   *     "operator": "GreaterThan",
   *     "threshold": 80,
   *     "aggregation": "Average"
   *   },
   *   "evaluationFrequency": "PT5M",
   *   "windowSize": "PT15M"
   * }
   * ```
   */
  createAlertRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const body = createAlertRuleSchema.parse(req.body);

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
        `[AlertRulesController] createAlertRule - Account: ${body.accountId}, Name: ${body.name}`
      );

      // Create alert rule
      const rule = await this.service.createAlertRule(body.accountId, tenantId, {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        severity: body.severity,
        targetResourceId: body.targetResourceId,
        resourceGroupName: body.resourceGroupName,
        condition: body.condition,
        actionGroupIds: body.actionGroupIds,
        evaluationFrequency: body.evaluationFrequency,
        windowSize: body.windowSize,
        autoMitigate: body.autoMitigate,
      });

      // Transform to response format
      const data: AlertRuleResponse = {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        description: rule.description,
        enabled: rule.enabled,
        severity: rule.severity,
        targetResourceId: rule.targetResourceId,
        condition: rule.condition,
        actionGroups: rule.actionGroups,
        evaluationFrequency: rule.evaluationFrequency,
        windowSize: rule.windowSize,
        autoMitigate: rule.autoMitigate,
      };

      console.log(`[AlertRulesController] createAlertRule - Created rule: ${rule.id}`);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'createAlertRule');
    }
  };

  /**
   * PUT /api/v1/alert-rules/:id
   *
   * Updates an existing alert rule.
   *
   * Request Body (all fields optional):
   * ```json
   * {
   *   "enabled": false,
   *   "severity": 1,
   *   "description": "Updated description"
   * }
   * ```
   */
  updateAlertRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Extract rule ID from URL
      const ruleId = req.params.id;
      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Alert rule ID is required',
        });
        return;
      }

      // Validate request body
      const body = updateAlertRuleSchema.parse(req.body);

      // Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      // Extract accountId from query
      const accountId = req.query.accountId as string;
      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'accountId query parameter is required',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[AlertRulesController] updateAlertRule - Rule: ${ruleId}`);

      // Update alert rule
      const rule = await this.service.updateAlertRule(ruleId, accountId, tenantId, {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        severity: body.severity,
        condition: body.condition,
        actionGroupIds: body.actionGroupIds,
        evaluationFrequency: body.evaluationFrequency,
        windowSize: body.windowSize,
        autoMitigate: body.autoMitigate,
      } as any);

      // Transform to response format
      const data: AlertRuleResponse = {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        description: rule.description,
        enabled: rule.enabled,
        severity: rule.severity,
        targetResourceId: rule.targetResourceId,
        condition: rule.condition,
        actionGroups: rule.actionGroups,
        evaluationFrequency: rule.evaluationFrequency,
        windowSize: rule.windowSize,
        autoMitigate: rule.autoMitigate,
      };

      console.log(`[AlertRulesController] updateAlertRule - Updated rule: ${rule.id}`);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'updateAlertRule');
    }
  };

  /**
   * DELETE /api/v1/alert-rules/:id
   *
   * Deletes an alert rule.
   *
   * Query Parameters:
   * - accountId (required): Cloud account UUID
   */
  deleteAlertRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Extract rule ID from URL
      const ruleId = req.params.id;
      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Alert rule ID is required',
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

      // Extract accountId from query
      const accountId = req.query.accountId as string;
      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'accountId query parameter is required',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[AlertRulesController] deleteAlertRule - Rule: ${ruleId}`);

      // Delete alert rule
      await this.service.deleteAlertRule(ruleId, accountId, tenantId);

      console.log(`[AlertRulesController] deleteAlertRule - Deleted rule: ${ruleId}`);

      res.json({
        success: true,
        message: 'Alert rule deleted successfully',
      });
    } catch (error) {
      this.handleError(error, res, 'deleteAlertRule');
    }
  };

  /**
   * GET /api/v1/alert-rules/templates
   *
   * Gets pre-built alert rule templates.
   *
   * Query Parameters:
   * - provider (optional): Cloud provider (default: 'azure')
   */
  getAlertRuleTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const provider = (req.query.provider as string) || 'azure';

      console.log(`[AlertRulesController] getAlertRuleTemplates - Provider: ${provider}`);

      // Fetch templates
      const templates = await this.service.getAlertRuleTemplates(provider);

      // Transform to response format
      const data: AlertRuleTemplateResponse[] = templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        config: template.config,
      }));

      console.log(`[AlertRulesController] getAlertRuleTemplates - Retrieved ${data.length} templates`);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getAlertRuleTemplates');
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
      console.error(`[AlertRulesController] ${method} - Validation error:`, error.errors);
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
    console.error(`[AlertRulesController] ${method} - Error:`, error);

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
export const alertRulesController = new AlertRulesController();
