/**
 * Dependencies Controller
 *
 * Handles HTTP requests for resource dependency analysis and graph visualization.
 *
 * Endpoints:
 * - GET /api/v1/dependencies/resource/:id - Get resource dependencies
 * - GET /api/v1/dependencies/resource-group/:id/graph - Get resource group dependency graph
 * - GET /api/v1/dependencies/circular - Find circular dependencies
 * - POST /api/v1/dependencies/impact-analysis - Perform impact analysis
 * - GET /api/v1/dependencies/metrics - Get dependency metrics
 *
 * @module modules/assets/controllers/dependencies.controller
 */

import { Request, Response, NextFunction } from 'express';
import { ResourceDependenciesService } from '../services/resource-dependencies.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';
import type {
  GetDependenciesQueryDto,
  GetDependencyGraphQueryDto,
  ImpactAnalysisRequestDto,
  CircularDependenciesQueryDto,
  DependencyMetricsQueryDto,
  DependencyResponse,
} from '../dto/dependency.dto';

/**
 * Dependencies Controller
 */
export class DependenciesController {
  /**
   * GET /api/v1/dependencies/resource/:id
   *
   * Get dependencies for a specific resource
   *
   * Query params:
   * - depth: 1-3 (default: 2)
   * - includeIndirect: boolean (default: true)
   *
   * @example
   * GET /api/v1/dependencies/resource/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1?depth=2
   */
  async getResourceDependencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const resourceId = req.params.id;
      const { depth = 2, includeIndirect = true } = req.query as unknown as GetDependenciesQueryDto;

      // Validate depth
      const depthNum = Number(depth);
      if (isNaN(depthNum) || depthNum < 1 || depthNum > 3) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DEPTH',
            message: 'Depth must be between 1 and 3',
          },
        });
        return;
      }

      // Get credentials from request (set by auth middleware)
      const credentials = (req as any).cloudCredentials as CloudProviderCredentials;
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cloud provider credentials not found',
          },
        });
        return;
      }

      // Extract subscription ID from resource ID
      const accountId = this.extractSubscriptionId(resourceId);

      // Create service instance
      const service = new ResourceDependenciesService(credentials);

      // Get dependencies
      const graph = await service.getResourceDependencies(accountId, resourceId, depthNum);

      const queryTime = Date.now() - startTime;

      const response: DependencyResponse<typeof graph> = {
        success: true,
        data: graph,
        metadata: {
          queryTime,
          cached: false,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[DependenciesController] Error getting resource dependencies:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/dependencies/resource-group/:id/graph
   *
   * Get complete dependency graph for a resource group
   *
   * Query params:
   * - groupBy: 'type' | 'layer' | 'location' (default: 'type')
   * - layout: 'hierarchical' | 'force' | 'circular' (default: 'hierarchical')
   *
   * @example
   * GET /api/v1/dependencies/resource-group/subscriptions/123/resourceGroups/rg1/graph?groupBy=type
   */
  async getResourceGroupDependencyGraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const resourceGroupId = req.params.id;
      const { groupBy = 'type', layout = 'hierarchical' } = req.query as unknown as GetDependencyGraphQueryDto;

      // Get credentials
      const credentials = (req as any).cloudCredentials as CloudProviderCredentials;
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cloud provider credentials not found',
          },
        });
        return;
      }

      // Extract subscription ID
      const accountId = this.extractSubscriptionId(resourceGroupId);

      // Create service instance
      const service = new ResourceDependenciesService(credentials);

      // Get dependency graph
      const graph = await service.getResourceGroupDependencyGraph(accountId, resourceGroupId);

      const queryTime = Date.now() - startTime;

      const response: DependencyResponse<typeof graph> = {
        success: true,
        data: graph,
        metadata: {
          queryTime,
          cached: false,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[DependenciesController] Error getting resource group graph:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/dependencies/circular
   *
   * Find circular dependencies in an account
   *
   * Query params:
   * - accountId: string (required)
   * - resourceGroupId: string (optional)
   * - severity: 'warning' | 'error' (optional)
   *
   * @example
   * GET /api/v1/dependencies/circular?accountId=subscription-123
   */
  async getCircularDependencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const { accountId, resourceGroupId, severity } = req.query as unknown as CircularDependenciesQueryDto;

      if (!accountId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ACCOUNT_ID',
            message: 'accountId query parameter is required',
          },
        });
        return;
      }

      // Get credentials
      const credentials = (req as any).cloudCredentials as CloudProviderCredentials;
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cloud provider credentials not found',
          },
        });
        return;
      }

      // Create service instance
      const service = new ResourceDependenciesService(credentials);

      // Find circular dependencies
      let circularDeps = await service.findCircularDependencies(accountId);

      // Filter by severity if provided
      if (severity) {
        circularDeps = circularDeps.filter(dep => dep.severity === severity);
      }

      const queryTime = Date.now() - startTime;

      const response: DependencyResponse<typeof circularDeps> = {
        success: true,
        data: circularDeps,
        metadata: {
          queryTime,
          cached: false,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[DependenciesController] Error finding circular dependencies:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/dependencies/impact-analysis
   *
   * Perform impact analysis for deleting or modifying a resource
   *
   * Body:
   * - accountId: string (required)
   * - resourceId: string (required)
   * - action: 'delete' | 'modify' (required)
   * - scope: 'direct' | 'full' (optional, default: 'full')
   *
   * @example
   * POST /api/v1/dependencies/impact-analysis
   * {
   *   "accountId": "subscription-123",
   *   "resourceId": "/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1",
   *   "action": "delete"
   * }
   */
  async performImpactAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const { accountId, resourceId, action, scope = 'full' } = req.body as ImpactAnalysisRequestDto;

      // Validate input
      if (!accountId || !resourceId || !action) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'accountId, resourceId, and action are required',
          },
        });
        return;
      }

      if (action !== 'delete' && action !== 'modify') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'action must be "delete" or "modify"',
          },
        });
        return;
      }

      // Get credentials
      const credentials = (req as any).cloudCredentials as CloudProviderCredentials;
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cloud provider credentials not found',
          },
        });
        return;
      }

      // Create service instance
      const service = new ResourceDependenciesService(credentials);

      // Perform impact analysis
      const analysis = await service.getImpactAnalysis(accountId, resourceId, action);

      const queryTime = Date.now() - startTime;

      const response: DependencyResponse<typeof analysis> = {
        success: true,
        data: analysis,
        metadata: {
          queryTime,
          cached: false,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[DependenciesController] Error performing impact analysis:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/dependencies/metrics
   *
   * Get dependency metrics for an account
   *
   * Query params:
   * - accountId: string (required)
   * - resourceGroupId: string (optional)
   * - includeAntiPatterns: boolean (default: true)
   *
   * @example
   * GET /api/v1/dependencies/metrics?accountId=subscription-123
   */
  async getDependencyMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const { accountId, resourceGroupId, includeAntiPatterns = true } = req.query as unknown as DependencyMetricsQueryDto;

      if (!accountId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ACCOUNT_ID',
            message: 'accountId query parameter is required',
          },
        });
        return;
      }

      // Get credentials
      const credentials = (req as any).cloudCredentials as CloudProviderCredentials;
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cloud provider credentials not found',
          },
        });
        return;
      }

      // Create service instance
      const service = new ResourceDependenciesService(credentials);

      // Get metrics
      const metrics = await service.getDependencyMetrics(accountId);

      // Filter anti-patterns if requested
      if (!includeAntiPatterns) {
        metrics.antiPatterns = [];
      }

      const queryTime = Date.now() - startTime;

      const response: DependencyResponse<typeof metrics> = {
        success: true,
        data: metrics,
        metadata: {
          queryTime,
          cached: false,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('[DependenciesController] Error getting dependency metrics:', error);
      next(error);
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Extract subscription ID from Azure resource ID
   *
   * @private
   */
  private extractSubscriptionId(resourceId: string): string {
    const match = resourceId.match(/subscriptions\/([^/]+)/i);
    if (!match) {
      throw new Error(`Invalid Azure resource ID: ${resourceId}`);
    }
    return match[1];
  }
}

// Export singleton instance
export const dependenciesController = new DependenciesController();
