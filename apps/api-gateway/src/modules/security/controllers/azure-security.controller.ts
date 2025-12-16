/**
 * Azure Security Controller
 * Handles HTTP requests for Azure Security Center endpoints
 *
 * This controller is specific to Azure Security Center (Microsoft Defender for Cloud)
 * and is separate from the general security scanning controller.
 */

import { Request, Response } from 'express';
import { SecurityService } from '../services/security.service';
import {
  validateSecurityScoreQuery,
  type SecurityScoreQueryDto,
} from '../dto/security-score.dto';
import {
  validateAssessmentsQuery,
  type AssessmentsQueryDto,
} from '../dto/assessment.dto';
import {
  validateComplianceQuery,
  validateRecommendationsQuery,
  type RecommendationsQueryDto,
} from '../dto/compliance.dto';
import { logger } from '../../../utils/logger';

/**
 * Get security score
 * GET /api/v1/security/azure/score?accountId=xxx&includeBreakdown=true
 *
 * @description Returns the overall security score for an Azure subscription
 * @access Authenticated users
 */
export const getSecurityScore = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validation = validateSecurityScoreQuery(req.query);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
      });
      return;
    }

    const query = validation.data as SecurityScoreQueryDto;

    // Fetch security score
    const score = await SecurityService.getSecurityScore(query);

    res.status(200).json({
      success: true,
      data: score,
      meta: {
        accountId: query.accountId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting security score:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'ACCOUNT_NOT_FOUND',
        },
      });
      return;
    }

    if (error.message.includes('not an Azure account')) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_ACCOUNT_TYPE',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get security score',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Get security assessments
 * GET /api/v1/security/azure/assessments?accountId=xxx&severity=high,critical&status=Unhealthy
 *
 * @description Returns paginated security assessments with optional filters
 * @access Authenticated users
 */
export const getSecurityAssessments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate query parameters
    const validation = validateAssessmentsQuery(req.query);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
      });
      return;
    }

    const query = validation.data as AssessmentsQueryDto;

    // Fetch assessments
    const result = await SecurityService.getSecurityAssessments(query);

    res.status(200).json({
      success: true,
      data: result.assessments,
      pagination: result.pagination,
      filters: result.filters,
      meta: {
        accountId: query.accountId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting security assessments:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'ACCOUNT_NOT_FOUND',
        },
      });
      return;
    }

    if (error.message.includes('not an Azure account')) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_ACCOUNT_TYPE',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get security assessments',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Get compliance results
 * GET /api/v1/security/azure/compliance?accountId=xxx
 *
 * @description Returns compliance status for all regulatory standards
 * @access Authenticated users
 */
export const getComplianceResults = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate query parameters
    const validation = validateComplianceQuery(req.query);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
      });
      return;
    }

    const { accountId } = validation.data!;

    // Fetch compliance results
    const result = await SecurityService.getComplianceResults(accountId);

    res.status(200).json({
      success: true,
      data: result.compliance,
      summary: result.summary,
      meta: {
        accountId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting compliance results:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'ACCOUNT_NOT_FOUND',
        },
      });
      return;
    }

    if (error.message.includes('not an Azure account')) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_ACCOUNT_TYPE',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get compliance results',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
    });
  }
};

/**
 * Get security recommendations
 * GET /api/v1/security/azure/recommendations?accountId=xxx&severity=high,critical
 *
 * @description Returns prioritized security recommendations
 * @access Authenticated users
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validation = validateRecommendationsQuery(req.query);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: validation.errors,
        },
      });
      return;
    }

    const query = validation.data as RecommendationsQueryDto;

    // Fetch recommendations
    const result = await SecurityService.getRecommendations(query);

    res.status(200).json({
      success: true,
      data: result.recommendations,
      summary: result.summary,
      pagination: result.pagination,
      meta: {
        accountId: query.accountId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting security recommendations:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'ACCOUNT_NOT_FOUND',
        },
      });
      return;
    }

    if (error.message.includes('not an Azure account')) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_ACCOUNT_TYPE',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get security recommendations',
        code: 'INTERNAL_ERROR',
        details: error.message,
      },
    });
  }
};
