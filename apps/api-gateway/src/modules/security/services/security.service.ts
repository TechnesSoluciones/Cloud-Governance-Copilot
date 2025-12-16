/**
 * Security Service
 * Orchestrates security operations, aggregates data from Azure Security Center,
 * manages caching, and tracks API usage for billing
 */

import { AzureSecurityCenterService } from '../../../integrations/azure/security-center.service';
import { AzureCredentialsService } from '../../../services/azure/azureCredentials.service';
import { AzureCacheService } from '../../../services/azure/azureCache.service';
import { AzureRateLimiterService } from '../../../services/azure/azureRateLimiter.service';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import type {
  SecurityScoreDto,
  SecurityScoreControlDto,
  SecurityScoreQueryDto,
} from '../dto/security-score.dto';
import type {
  SecurityAssessmentDto,
  AssessmentsResponseDto,
  AssessmentsQueryDto,
} from '../dto/assessment.dto';
import {
  sortAssessments,
} from '../dto/assessment.dto';
import type {
  ComplianceResponseDto,
  ComplianceResultDto,
  RecommendationsResponseDto,
  SecurityRecommendationDto,
  RecommendationsQueryDto,
} from '../dto/compliance.dto';

const prisma = new PrismaClient();

/**
 * Security Service
 *
 * Features:
 * - Orchestrates calls to Azure Security Center Service
 * - Implements caching with 5-minute TTL
 * - Rate limiting integration
 * - Usage tracking for billing
 * - Error handling and logging
 */
export class SecurityService {
  /**
   * Get security score for an account
   *
   * @param query - Security score query parameters
   * @returns Security score with optional breakdown
   */
  static async getSecurityScore(query: SecurityScoreQueryDto): Promise<SecurityScoreDto> {
    const { accountId, includeBreakdown } = query;

    try {
      // Validate account exists
      await this.validateAccount(accountId);

      // Check rate limit
      await AzureRateLimiterService.waitForRateLimit('securityCenter', accountId);

      // Try cache first
      const cacheKey = includeBreakdown ? ['score', 'breakdown'] : ['score'];
      const cached = await AzureCacheService.get<SecurityScoreDto>(
        'security',
        accountId,
        cacheKey
      );

      if (cached) {
        logger.info('Security score cache hit', { accountId, includeBreakdown });
        return cached;
      }

      // Get credentials
      const credentials = await AzureCredentialsService.getCredentials(accountId);

      // Initialize Security Center service
      const securityService = new AzureSecurityCenterService({
        provider: 'azure',
        azureClientId: credentials.clientId,
        azureClientSecret: credentials.clientSecret,
        azureTenantId: credentials.tenantId,
        azureSubscriptionId: credentials.subscriptionId,
      });

      // Fetch security score
      const scoreResult = await securityService.getSecurityScore();

      // Fetch breakdown if requested
      let breakdown: SecurityScoreControlDto[] | undefined;
      if (includeBreakdown) {
        const controls = await securityService.getSecurityScoreControls();
        breakdown = controls.map(control => ({
          displayName: control.displayName,
          score: control.score,
          weight: control.weight,
        }));
      }

      const result: SecurityScoreDto = {
        displayName: scoreResult.displayName,
        score: scoreResult.score,
        weight: scoreResult.weight,
        breakdown,
      };

      // Cache result (5 min TTL)
      await AzureCacheService.set('security', accountId, cacheKey, result);

      // Track usage for billing
      await this.trackUsage(accountId, 'getSecurityScore', 1);

      // Consume rate limit token
      await AzureRateLimiterService.consumeToken('securityCenter', accountId);

      logger.info('Security score retrieved', { accountId, includeBreakdown });

      return result;
    } catch (error: any) {
      logger.error('Failed to get security score', {
        accountId,
        error: error.message,
      });
      throw new Error(`Failed to get security score: ${error.message}`);
    }
  }

  /**
   * Get security assessments for an account
   *
   * @param query - Assessments query parameters
   * @returns Paginated security assessments
   */
  static async getSecurityAssessments(
    query: AssessmentsQueryDto
  ): Promise<AssessmentsResponseDto> {
    const {
      accountId,
      severity,
      status,
      resourceType,
      limit = 50,
      offset = 0,
      sortBy,
      sortOrder = 'desc',
    } = query;

    try {
      // Validate account exists
      await this.validateAccount(accountId);

      // Check rate limit
      await AzureRateLimiterService.waitForRateLimit('securityCenter', accountId);

      // Build cache key from filters
      const cacheKey = [
        'assessments',
        severity?.join(',') || 'all',
        status || 'all',
        resourceType || 'all',
      ];

      // Try cache first (we cache the full list, then apply pagination in-memory)
      let allAssessments = await AzureCacheService.get<SecurityAssessmentDto[]>(
        'security',
        accountId,
        cacheKey
      );

      if (!allAssessments) {
        // Get credentials
        const credentials = await AzureCredentialsService.getCredentials(accountId);

        // Initialize Security Center service
        const securityService = new AzureSecurityCenterService({
          provider: 'azure',
          azureClientId: credentials.clientId,
          azureClientSecret: credentials.clientSecret,
          azureTenantId: credentials.tenantId,
          azureSubscriptionId: credentials.subscriptionId,
        });

        // Fetch assessments
        const assessmentsResult = await securityService.getSecurityAssessments({
          severity,
          status,
          resourceType,
        });

        allAssessments = assessmentsResult.map(a => ({
          id: a.id,
          name: a.name,
          displayName: a.displayName,
          description: a.description,
          severity: a.severity,
          status: a.status,
          resourceId: a.resourceId,
          resourceType: a.resourceType,
          remediation: a.remediation,
          category: a.category,
          compliance: a.compliance,
          metadata: a.metadata,
        }));

        // Cache result (5 min TTL)
        await AzureCacheService.set('security', accountId, cacheKey, allAssessments);

        // Track usage for billing
        await this.trackUsage(accountId, 'getSecurityAssessments', 1);

        // Consume rate limit token
        await AzureRateLimiterService.consumeToken('securityCenter', accountId);

        logger.info('Security assessments retrieved from API', {
          accountId,
          count: allAssessments.length,
        });
      } else {
        logger.info('Security assessments cache hit', {
          accountId,
          count: allAssessments.length,
        });
      }

      // Apply sorting
      const sortedAssessments = sortAssessments(allAssessments, sortBy, sortOrder);

      // Apply pagination
      const paginatedAssessments = sortedAssessments.slice(offset, offset + limit);
      const hasMore = offset + limit < sortedAssessments.length;

      return {
        assessments: paginatedAssessments,
        pagination: {
          total: sortedAssessments.length,
          limit,
          offset,
          hasMore,
        },
        filters: {
          severity,
          status,
          resourceType,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get security assessments', {
        accountId,
        error: error.message,
      });
      throw new Error(`Failed to get security assessments: ${error.message}`);
    }
  }

  /**
   * Get compliance results for an account
   *
   * @param accountId - Cloud account ID
   * @returns Compliance status for all standards
   */
  static async getComplianceResults(accountId: string): Promise<ComplianceResponseDto> {
    try {
      // Validate account exists
      await this.validateAccount(accountId);

      // Check rate limit
      await AzureRateLimiterService.waitForRateLimit('securityCenter', accountId);

      // Try cache first
      const cached = await AzureCacheService.get<ComplianceResponseDto>(
        'security',
        accountId,
        ['compliance']
      );

      if (cached) {
        logger.info('Compliance results cache hit', { accountId });
        return cached;
      }

      // Get credentials
      const credentials = await AzureCredentialsService.getCredentials(accountId);

      // Initialize Security Center service
      const securityService = new AzureSecurityCenterService({
        provider: 'azure',
        azureClientId: credentials.clientId,
        azureClientSecret: credentials.clientSecret,
        azureTenantId: credentials.tenantId,
        azureSubscriptionId: credentials.subscriptionId,
      });

      // Fetch compliance results
      const complianceResults = await securityService.getComplianceResults();

      // Map to DTOs
      const compliance: ComplianceResultDto[] = complianceResults.map(result => ({
        standardName: result.standardName,
        passedControls: result.passedControls,
        failedControls: result.failedControls,
        skippedControls: result.skippedControls,
        totalControls: result.totalControls,
        compliancePercentage: result.compliancePercentage,
      }));

      // Calculate summary
      const totalStandards = compliance.length;
      const averageCompliance = totalStandards > 0
        ? Math.round(
            compliance.reduce((sum, c) => sum + c.compliancePercentage, 0) / totalStandards
          )
        : 0;
      const criticalFailures = compliance.reduce(
        (sum, c) => sum + c.failedControls,
        0
      );

      const result: ComplianceResponseDto = {
        compliance,
        summary: {
          totalStandards,
          averageCompliance,
          criticalFailures,
        },
      };

      // Cache result (5 min TTL)
      await AzureCacheService.set('security', accountId, ['compliance'], result);

      // Track usage for billing
      await this.trackUsage(accountId, 'getComplianceResults', 1);

      // Consume rate limit token
      await AzureRateLimiterService.consumeToken('securityCenter', accountId);

      logger.info('Compliance results retrieved', { accountId, totalStandards });

      return result;
    } catch (error: any) {
      logger.error('Failed to get compliance results', {
        accountId,
        error: error.message,
      });
      throw new Error(`Failed to get compliance results: ${error.message}`);
    }
  }

  /**
   * Get security recommendations for an account
   *
   * @param query - Recommendations query parameters
   * @returns Prioritized security recommendations
   */
  static async getRecommendations(
    query: RecommendationsQueryDto
  ): Promise<RecommendationsResponseDto> {
    const {
      accountId,
      severity,
      category,
      limit = 50,
      offset = 0,
      sortBy = 'priority',
      sortOrder = 'desc',
    } = query;

    try {
      // Validate account exists
      await this.validateAccount(accountId);

      // Get all unhealthy assessments as recommendations
      const assessmentsResult = await this.getSecurityAssessments({
        accountId,
        status: 'Unhealthy',
        severity,
        limit: 1000, // Get all for recommendations
        offset: 0,
      });

      // Convert assessments to recommendations
      let recommendations: SecurityRecommendationDto[] = assessmentsResult.assessments.map(
        (assessment, index) => {
          // Calculate priority (1-100) based on severity and affected resources
          const severityScore = {
            critical: 100,
            high: 75,
            medium: 50,
            low: 25,
            informational: 10,
          }[assessment.severity];

          const priority = Math.min(100, severityScore);

          return {
            id: assessment.id,
            title: assessment.displayName,
            description: assessment.description,
            severity: assessment.severity,
            category: assessment.category,
            impact: `Security ${assessment.severity} severity issue`,
            remediation: assessment.remediation || 'No remediation steps available',
            affectedResources: 1, // Each assessment typically affects one resource
            estimatedEffort: assessment.metadata.implementationEffort as
              | 'Low'
              | 'Medium'
              | 'High'
              | undefined,
            securityImpact: assessment.metadata.userImpact as
              | 'Low'
              | 'Medium'
              | 'High'
              | undefined,
            complianceStandards: assessment.compliance,
            priority,
          };
        }
      );

      // Filter by category if specified
      if (category) {
        recommendations = recommendations.filter(
          r => r.category.toLowerCase() === category.toLowerCase()
        );
      }

      // Sort recommendations
      recommendations.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'priority':
            comparison = a.priority - b.priority;
            break;
          case 'severity': {
            const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, informational: 1 };
            comparison = severityOrder[a.severity] - severityOrder[b.severity];
            break;
          }
          case 'affectedResources':
            comparison = a.affectedResources - b.affectedResources;
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Calculate summary
      const bySeverity = recommendations.reduce(
        (acc, rec) => {
          acc[rec.severity]++;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
      );

      const byCategory = recommendations.reduce((acc, rec) => {
        acc[rec.category] = (acc[rec.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Apply pagination
      const paginatedRecommendations = recommendations.slice(offset, offset + limit);
      const hasMore = offset + limit < recommendations.length;

      logger.info('Security recommendations generated', {
        accountId,
        total: recommendations.length,
        paginated: paginatedRecommendations.length,
      });

      return {
        recommendations: paginatedRecommendations,
        summary: {
          total: recommendations.length,
          bySeverity,
          byCategory,
        },
        pagination: {
          limit,
          offset,
          hasMore,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get security recommendations', {
        accountId,
        error: error.message,
      });
      throw new Error(`Failed to get security recommendations: ${error.message}`);
    }
  }

  /**
   * Validate that account exists and is accessible
   *
   * @param accountId - Cloud account ID
   * @throws Error if account not found or invalid
   */
  private static async validateAccount(accountId: string): Promise<void> {
    const account = await prisma.cloudAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Cloud account not found: ${accountId}`);
    }

    if (account.provider !== 'azure' && account.provider !== 'AZURE') {
      throw new Error(`Account ${accountId} is not an Azure account`);
    }
  }

  /**
   * Track API usage for billing purposes
   *
   * @param accountId - Cloud account ID
   * @param operation - Operation name
   * @param requestCount - Number of requests made
   */
  private static async trackUsage(
    accountId: string,
    operation: string,
    requestCount: number
  ): Promise<void> {
    try {
      // This could be implemented to track usage in a separate table
      // for billing and monitoring purposes
      logger.debug('API usage tracked', {
        accountId,
        operation,
        requestCount,
        timestamp: new Date().toISOString(),
      });

      // Example: Store in usage tracking table
      // await prisma.apiUsage.create({
      //   data: {
      //     accountId,
      //     operation,
      //     requestCount,
      //     timestamp: new Date(),
      //   },
      // });
    } catch (error: any) {
      // Don't throw - usage tracking failures should not break API calls
      logger.warn('Failed to track API usage', {
        accountId,
        operation,
        error: error.message,
      });
    }
  }
}
