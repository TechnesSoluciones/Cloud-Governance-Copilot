/**
 * Policy Controller
 * Handles HTTP requests for Azure Policy endpoints
 */

import { Request, Response } from 'express';
import { AzurePolicyService } from '../../../integrations/azure/policy.service';
import { PolicyIntegrationService } from '../services/policy-integration.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';

/**
 * Gets cloud credentials from request
 * In production, this would fetch from database based on user/tenant
 */
function getCredentials(accountId: string): CloudProviderCredentials {
  return {
    provider: 'azure',
    azureClientId: process.env.AZURE_CLIENT_ID || '',
    azureClientSecret: process.env.AZURE_CLIENT_SECRET || '',
    azureTenantId: process.env.AZURE_TENANT_ID || '',
    azureSubscriptionId: accountId || process.env.AZURE_SUBSCRIPTION_ID || '',
  };
}

/**
 * @route   GET /api/v1/policy/assignments
 * @desc    Get all policy assignments for the account
 */
export async function getPolicyAssignments(req: Request, res: Response): Promise<void> {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const policyService = new AzurePolicyService(credentials);

    const assignments = await policyService.getPolicyAssignments(accountId);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        count: assignments.length,
        assignments,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting policy assignments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get policy assignments',
    });
  }
}

/**
 * @route   GET /api/v1/policy/compliance
 * @desc    Get overall policy compliance status
 */
export async function getPolicyCompliance(req: Request, res: Response): Promise<void> {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const policyService = new AzurePolicyService(credentials);

    const compliance = await policyService.getPolicyCompliance(accountId);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        compliance,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting policy compliance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get policy compliance',
    });
  }
}

/**
 * @route   GET /api/v1/policy/non-compliant
 * @desc    Get non-compliant resources
 */
export async function getNonCompliantResources(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, policyId, severity, limit } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const policyService = new AzurePolicyService(credentials);

    let resources = await policyService.getNonCompliantResources(
      accountId,
      policyId as string | undefined
    );

    // Apply severity filter if provided
    if (severity && typeof severity === 'string') {
      const severityFilter = severity.toLowerCase();
      resources = resources.filter((r) => r.severity === severityFilter);
    }

    // Apply limit if provided
    const maxLimit = Math.min(Number(limit) || 100, 1000);
    resources = resources.slice(0, maxLimit);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        count: resources.length,
        resources,
        filters: {
          policyId: policyId || null,
          severity: severity || null,
          limit: maxLimit,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting non-compliant resources:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get non-compliant resources',
    });
  }
}

/**
 * @route   GET /api/v1/policy/definitions
 * @desc    Get available policy definitions
 */
export async function getPolicyDefinitions(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, policyType, category } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const policyService = new AzurePolicyService(credentials);

    let definitions = await policyService.getPolicyDefinitions(accountId);

    // Apply filters
    if (policyType && typeof policyType === 'string') {
      definitions = definitions.filter((d) => d.policyType === policyType);
    }

    if (category && typeof category === 'string') {
      definitions = definitions.filter((d) => d.category === category);
    }

    res.status(200).json({
      success: true,
      data: {
        accountId,
        count: definitions.length,
        definitions,
        filters: {
          policyType: policyType || null,
          category: category || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting policy definitions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get policy definitions',
    });
  }
}

/**
 * @route   POST /api/v1/policy/evaluate
 * @desc    Evaluate compliance for a specific resource
 */
export async function evaluatePolicyCompliance(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, resourceId } = req.body;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId is required in request body',
      });
      return;
    }

    if (!resourceId || typeof resourceId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'resourceId is required in request body',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const policyService = new AzurePolicyService(credentials);

    const evaluation = await policyService.evaluatePolicyCompliance(accountId, resourceId);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        resourceId,
        evaluation,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error evaluating policy compliance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate policy compliance',
    });
  }
}

/**
 * @route   GET /api/v1/policy/security-score
 * @desc    Get policy-based security score
 */
export async function getPolicySecurityScore(req: Request, res: Response): Promise<void> {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const integrationService = new PolicyIntegrationService(credentials);

    const score = await integrationService.getPolicySecurityScore(accountId);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        score,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting policy security score:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get policy security score',
    });
  }
}

/**
 * @route   GET /api/v1/policy/recommendations
 * @desc    Get security recommendations based on policy violations
 */
export async function getPolicyRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, severity, category } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const integrationService = new PolicyIntegrationService(credentials);

    let recommendations = await integrationService.getPolicyRecommendations(accountId);

    // Apply filters
    if (severity && typeof severity === 'string') {
      recommendations = recommendations.filter((r) => r.severity === severity);
    }

    if (category && typeof category === 'string') {
      recommendations = recommendations.filter((r) => r.category === category);
    }

    res.status(200).json({
      success: true,
      data: {
        accountId,
        count: recommendations.length,
        recommendations,
        filters: {
          severity: severity || null,
          category: category || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting policy recommendations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get policy recommendations',
    });
  }
}

/**
 * @route   GET /api/v1/policy/gap-analysis
 * @desc    Get compliance gap analysis
 */
export async function getComplianceGapAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accountId query parameter is required',
      });
      return;
    }

    const credentials = getCredentials(accountId);
    const integrationService = new PolicyIntegrationService(credentials);

    const analysis = await integrationService.getComplianceGapAnalysis(accountId);

    res.status(200).json({
      success: true,
      data: {
        accountId,
        analysis,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PolicyController] Error getting compliance gap analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get compliance gap analysis',
    });
  }
}
