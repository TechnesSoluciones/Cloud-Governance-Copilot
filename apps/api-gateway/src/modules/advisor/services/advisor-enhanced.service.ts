/**
 * Enhanced Azure Advisor Service
 *
 * Extended version of the base Azure Advisor Service with:
 * - Redis caching (24h TTL)
 * - Rate limiting (10 req/min per tenant)
 * - Tenant isolation
 * - Database persistence
 * - Comprehensive error handling
 *
 * @module modules/advisor/services
 */

import { PrismaClient } from '@prisma/client';
import { AzureAdvisorService } from '../../../integrations/azure/advisor.service';
import { AzureRateLimiter, AZURE_RATE_LIMITS } from '../../../integrations/azure/rate-limiter';
import { getRedisSafe, isRedisAvailable } from '../../../config/redis';
import { logger } from '../../../utils/logger';
import type {
  AdvisorRecommendationDTO,
  RecommendationListItemDTO,
  RecommendationFiltersDTO,
  PaginatedRecommendationsDTO,
  RecommendationSummaryDTO,
  RecommendationCategory,
  RecommendationImpact,
  RecommendationStatus,
} from '../dto';
import type { AdvisorRecommendation } from '../../../integrations/azure/advisor.service';

/**
 * Enhanced Advisor Service Configuration
 */
interface AdvisorServiceConfig {
  tenantId: string;
  cloudAccountId: string;
  azureCredentials: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    subscriptionId: string;
  };
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  RECOMMENDATIONS_TTL: 24 * 60 * 60, // 24 hours in seconds
  SUMMARY_TTL: 12 * 60 * 60, // 12 hours in seconds
  KEY_PREFIX: 'advisor:',
};

/**
 * Rate limiter per tenant
 */
const tenantRateLimiters = new Map<string, AzureRateLimiter>();

/**
 * Gets or creates a rate limiter for a tenant
 */
function getTenantRateLimiter(tenantId: string): AzureRateLimiter {
  if (!tenantRateLimiters.has(tenantId)) {
    // Custom rate limit: 10 req/min per tenant for Advisor
    const rateLimiter = new AzureRateLimiter({
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      serviceName: `Advisor-Tenant-${tenantId.slice(0, 8)}`,
      enableAdaptiveBackoff: true,
      backoffThreshold: 80,
    });
    tenantRateLimiters.set(tenantId, rateLimiter);
  }
  return tenantRateLimiters.get(tenantId)!;
}

/**
 * Enhanced Azure Advisor Service
 *
 * Provides cached, rate-limited, tenant-isolated access to Azure Advisor recommendations.
 */
export class AdvisorEnhancedService {
  private prisma: PrismaClient;
  private baseService: AzureAdvisorService;
  private rateLimiter: AzureRateLimiter;
  private config: AdvisorServiceConfig;

  constructor(config: AdvisorServiceConfig, prisma?: PrismaClient) {
    this.config = config;
    this.prisma = prisma || new PrismaClient();
    this.rateLimiter = getTenantRateLimiter(config.tenantId);

    // Initialize base Azure Advisor Service
    this.baseService = new AzureAdvisorService({
      provider: 'azure',
      azureClientId: config.azureCredentials.clientId,
      azureClientSecret: config.azureCredentials.clientSecret,
      azureTenantId: config.azureCredentials.tenantId,
      azureSubscriptionId: config.azureCredentials.subscriptionId,
    });

    logger.info('[AdvisorEnhancedService] Initialized', {
      tenantId: config.tenantId,
      subscriptionId: config.azureCredentials.subscriptionId,
    });
  }

  /**
   * Gets recommendations with caching, filtering, and pagination
   *
   * @param filters - Recommendation filters
   * @returns Paginated recommendations
   */
  async getRecommendations(
    filters?: RecommendationFiltersDTO
  ): Promise<PaginatedRecommendationsDTO> {
    try {
      // Apply rate limiting
      await this.rateLimiter.waitForToken(
        this.config.azureCredentials.subscriptionId,
        'getRecommendations'
      );

      // Try cache first
      const cacheKey = this.buildCacheKey('recommendations', filters);
      const cached = await this.getFromCache<AdvisorRecommendation[]>(cacheKey);

      let recommendations: AdvisorRecommendation[];

      if (cached) {
        logger.info('[AdvisorEnhancedService] Cache hit for recommendations', {
          tenantId: this.config.tenantId,
        });
        recommendations = cached;
        this.rateLimiter.recordSuccess();
      } else {
        logger.info('[AdvisorEnhancedService] Cache miss, fetching from Azure', {
          tenantId: this.config.tenantId,
        });

        // Fetch from Azure
        recommendations = await this.baseService.getRecommendations({
          category: filters?.category,
          impact: filters?.impact,
          resourceType: filters?.resourceType,
        });

        this.rateLimiter.recordSuccess();

        // Cache the results
        await this.setCache(cacheKey, recommendations, CACHE_CONFIG.RECOMMENDATIONS_TTL);

        // Persist to database
        await this.persistRecommendations(recommendations);
      }

      // Apply additional filters and pagination
      return this.filterAndPaginate(recommendations, filters);
    } catch (error) {
      // Record throttle if 429
      if (error instanceof Error && error.message.includes('429')) {
        this.rateLimiter.recordThrottle();
      }

      logger.error('[AdvisorEnhancedService] Failed to get recommendations', {
        tenantId: this.config.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(`Failed to fetch Azure Advisor recommendations: ${error}`);
    }
  }

  /**
   * Gets a single recommendation by ID
   *
   * @param recommendationId - Azure recommendation ID
   * @returns Recommendation details
   */
  async getRecommendationById(recommendationId: string): Promise<AdvisorRecommendationDTO | null> {
    try {
      // Check database first (faster)
      const dbRec = await this.prisma.azureAdvisorRecommendation.findFirst({
        where: {
          tenantId: this.config.tenantId,
          azureRecommendationId: recommendationId,
        },
      });

      if (dbRec) {
        return this.mapDbToDto(dbRec);
      }

      // Not in database - fetch from Azure
      await this.rateLimiter.waitForToken(
        this.config.azureCredentials.subscriptionId,
        'getRecommendationById'
      );

      const allRecs = await this.baseService.getRecommendations();
      const rec = allRecs.find((r) => r.id === recommendationId);

      if (rec) {
        // Persist to database
        await this.persistRecommendations([rec]);
        return this.mapAzureToDto(rec);
      }

      return null;
    } catch (error) {
      logger.error('[AdvisorEnhancedService] Failed to get recommendation by ID', {
        tenantId: this.config.tenantId,
        recommendationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Gets recommendation summary
   *
   * @returns Summary statistics
   */
  async getRecommendationSummary(): Promise<RecommendationSummaryDTO> {
    try {
      // Try cache first
      const cacheKey = this.buildCacheKey('summary');
      const cached = await this.getFromCache<RecommendationSummaryDTO>(cacheKey);

      if (cached) {
        logger.info('[AdvisorEnhancedService] Cache hit for summary', {
          tenantId: this.config.tenantId,
        });
        return cached;
      }

      // Fetch recommendations
      const result = await this.getRecommendations();
      const recommendations = result.data;

      // Calculate summary
      const summary: RecommendationSummaryDTO = {
        totalRecommendations: recommendations.length,
        byCategory: {
          cost: 0,
          security: 0,
          reliability: 0,
          performance: 0,
          operationalExcellence: 0,
        },
        byImpact: {
          high: 0,
          medium: 0,
          low: 0,
        },
        byStatus: {
          active: 0,
          suppressed: 0,
          dismissed: 0,
          resolved: 0,
        },
        totalPotentialSavings: 0,
        currency: 'USD',
        categoryDetails: [],
        lastUpdated: new Date(),
      };

      // Aggregate statistics
      for (const rec of recommendations) {
        // By category
        const categoryKey = this.categoryToKey(rec.category);
        summary.byCategory[categoryKey]++;

        // By impact
        summary.byImpact[rec.impact.toLowerCase() as keyof typeof summary.byImpact]++;

        // By status
        summary.byStatus[rec.status.toLowerCase() as keyof typeof summary.byStatus]++;

        // Potential savings
        if (rec.potentialSavings) {
          summary.totalPotentialSavings += rec.potentialSavings.amount;
        }
      }

      // Cache the summary
      await this.setCache(cacheKey, summary, CACHE_CONFIG.SUMMARY_TTL);

      return summary;
    } catch (error) {
      logger.error('[AdvisorEnhancedService] Failed to get summary', {
        tenantId: this.config.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Suppresses a recommendation
   *
   * @param recommendationId - Recommendation ID
   * @param durationDays - Duration to suppress (days)
   * @param userId - User performing the action
   * @param notes - Optional notes
   * @returns Success status
   */
  async suppressRecommendation(
    recommendationId: string,
    durationDays: number,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const suppressUntil = new Date();
      suppressUntil.setDate(suppressUntil.getDate() + durationDays);

      // Update in database
      const updated = await this.prisma.azureAdvisorRecommendation.updateMany({
        where: {
          tenantId: this.config.tenantId,
          azureRecommendationId: recommendationId,
        },
        data: {
          status: 'Suppressed',
          suppressedUntil: suppressUntil,
          lastUpdated: new Date(),
        },
      });

      if (updated.count === 0) {
        logger.warn('[AdvisorEnhancedService] Recommendation not found for suppression', {
          tenantId: this.config.tenantId,
          recommendationId,
        });
        return false;
      }

      // Record action in advisor_actions
      const rec = await this.prisma.azureAdvisorRecommendation.findFirst({
        where: {
          tenantId: this.config.tenantId,
          azureRecommendationId: recommendationId,
        },
      });

      if (rec) {
        await this.prisma.advisorAction.create({
          data: {
            recommendationId: rec.recommendationId,
            userId,
            actionType: 'suppress',
            durationDays,
            notes,
          },
        });
      }

      // Invalidate cache
      await this.invalidateCache();

      logger.info('[AdvisorEnhancedService] Recommendation suppressed', {
        tenantId: this.config.tenantId,
        recommendationId,
        durationDays,
        suppressUntil,
      });

      return true;
    } catch (error) {
      logger.error('[AdvisorEnhancedService] Failed to suppress recommendation', {
        tenantId: this.config.tenantId,
        recommendationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Persists recommendations to database
   */
  private async persistRecommendations(recommendations: AdvisorRecommendation[]): Promise<void> {
    try {
      for (const rec of recommendations) {
        await this.prisma.azureAdvisorRecommendation.upsert({
          where: {
            tenantId_azureRecommendationId: {
              tenantId: this.config.tenantId,
              azureRecommendationId: rec.id,
            },
          },
          update: {
            category: rec.category,
            impact: rec.impact,
            shortDescription: rec.shortDescription,
            longDescription: rec.longDescription,
            resourceId: rec.metadata.resourceId || rec.id,
            resourceType: rec.metadata.resourceType,
            potentialSavingsAmount: rec.metadata.estimatedSavings?.amount,
            potentialSavingsCurrency: rec.metadata.estimatedSavings?.currency,
            remediationSteps: rec.metadata.recommendedActions || [],
            lastUpdated: rec.lastUpdated || new Date(),
          },
          create: {
            tenantId: this.config.tenantId,
            azureRecommendationId: rec.id,
            category: rec.category,
            impact: rec.impact,
            shortDescription: rec.shortDescription,
            longDescription: rec.longDescription,
            resourceId: rec.metadata.resourceId || rec.id,
            resourceType: rec.metadata.resourceType,
            potentialSavingsAmount: rec.metadata.estimatedSavings?.amount,
            potentialSavingsCurrency: rec.metadata.estimatedSavings?.currency,
            remediationSteps: rec.metadata.recommendedActions || [],
            status: 'Active',
            lastUpdated: rec.lastUpdated || new Date(),
          },
        });
      }

      logger.info('[AdvisorEnhancedService] Persisted recommendations to database', {
        tenantId: this.config.tenantId,
        count: recommendations.length,
      });
    } catch (error) {
      logger.error('[AdvisorEnhancedService] Failed to persist recommendations', {
        tenantId: this.config.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - persistence failure shouldn't break the flow
    }
  }

  /**
   * Filters and paginates recommendations
   */
  private filterAndPaginate(
    recommendations: AdvisorRecommendation[],
    filters?: RecommendationFiltersDTO
  ): PaginatedRecommendationsDTO {
    let filtered = recommendations;

    // Apply filters
    if (filters?.status) {
      // Note: Azure doesn't return status, so we'll default to Active
      filtered = filtered; // No-op for now
    }

    if (filters?.resourceGroup) {
      filtered = filtered.filter((r) => r.metadata.resourceGroup === filters.resourceGroup);
    }

    if (filters?.region) {
      filtered = filtered.filter((r) => r.metadata.region === filters.region);
    }

    if (filters?.minSavings) {
      filtered = filtered.filter(
        (r) => (r.metadata.estimatedSavings?.amount || 0) >= filters.minSavings!
      );
    }

    // Sort
    const sortBy = filters?.sortBy || 'lastUpdated';
    const sortOrder = filters?.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'impact') {
        const impactOrder = { High: 3, Medium: 2, Low: 1 };
        comparison = impactOrder[b.impact] - impactOrder[a.impact];
      } else if (sortBy === 'savings') {
        comparison = (b.metadata.estimatedSavings?.amount || 0) - (a.metadata.estimatedSavings?.amount || 0);
      } else if (sortBy === 'lastUpdated') {
        comparison = (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0);
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    // Paginate
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);

    // Calculate summary
    const totalSavings = filtered.reduce(
      (sum, r) => sum + (r.metadata.estimatedSavings?.amount || 0),
      0
    );

    const byCategory: any = {};
    const byImpact: any = {};

    for (const rec of filtered) {
      byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
      byImpact[rec.impact] = (byImpact[rec.impact] || 0) + 1;
    }

    return {
      data: paginatedData.map((r) => this.mapAzureToListItem(r)),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      summary: {
        totalSavings,
        byCategory,
        byImpact,
      },
    };
  }

  /**
   * Maps Azure recommendation to list item DTO
   */
  private mapAzureToListItem(rec: AdvisorRecommendation): RecommendationListItemDTO {
    return {
      id: rec.id,
      category: rec.category as RecommendationCategory,
      impact: rec.impact as RecommendationImpact,
      shortDescription: rec.shortDescription,
      resourceId: rec.metadata.resourceId || rec.id,
      resourceType: rec.metadata.resourceType,
      potentialSavings: rec.metadata.estimatedSavings
        ? {
            amount: rec.metadata.estimatedSavings.amount,
            currency: rec.metadata.estimatedSavings.currency,
          }
        : undefined,
      status: 'Active' as RecommendationStatus,
      lastUpdated: rec.lastUpdated || new Date(),
    };
  }

  /**
   * Maps Azure recommendation to full DTO
   */
  private mapAzureToDto(rec: AdvisorRecommendation): AdvisorRecommendationDTO {
    return {
      id: rec.id,
      category: rec.category as RecommendationCategory,
      impact: rec.impact as RecommendationImpact,
      shortDescription: rec.shortDescription,
      longDescription: rec.longDescription,
      potentialBenefits: rec.potentialBenefits,
      resourceId: rec.metadata.resourceId || rec.id,
      resourceType: rec.metadata.resourceType,
      resourceGroup: rec.metadata.resourceGroup,
      region: rec.metadata.region,
      potentialSavings: rec.metadata.estimatedSavings
        ? {
            amount: rec.metadata.estimatedSavings.amount,
            currency: rec.metadata.estimatedSavings.currency,
          }
        : undefined,
      remediationSteps: rec.metadata.recommendedActions || [],
      status: 'Active' as RecommendationStatus,
      lastUpdated: rec.lastUpdated || new Date(),
    };
  }

  /**
   * Maps database record to DTO
   */
  private mapDbToDto(dbRec: any): AdvisorRecommendationDTO {
    return {
      id: dbRec.azureRecommendationId,
      category: dbRec.category as RecommendationCategory,
      impact: dbRec.impact as RecommendationImpact,
      shortDescription: dbRec.shortDescription,
      longDescription: dbRec.longDescription,
      resourceId: dbRec.resourceId,
      resourceType: dbRec.resourceType,
      potentialSavings: dbRec.potentialSavingsAmount
        ? {
            amount: parseFloat(dbRec.potentialSavingsAmount),
            currency: dbRec.potentialSavingsCurrency || 'USD',
          }
        : undefined,
      remediationSteps: Array.isArray(dbRec.remediationSteps) ? dbRec.remediationSteps : [],
      status: dbRec.status as RecommendationStatus,
      lastUpdated: dbRec.lastUpdated,
      suppressedUntil: dbRec.suppressedUntil,
    };
  }

  /**
   * Builds cache key
   */
  private buildCacheKey(type: string, filters?: any): string {
    const base = `${CACHE_CONFIG.KEY_PREFIX}${this.config.tenantId}:${type}`;
    if (!filters) return base;

    const filterStr = JSON.stringify(filters);
    return `${base}:${Buffer.from(filterStr).toString('base64')}`;
  }

  /**
   * Gets value from Redis cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;

    try {
      const redis = getRedisSafe();
      if (!redis) return null;

      const cached = await redis.get(key);
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.warn('[AdvisorEnhancedService] Cache read failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Sets value in Redis cache
   */
  private async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!isRedisAvailable()) return;

    try {
      const redis = getRedisSafe();
      if (!redis) return;

      await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.warn('[AdvisorEnhancedService] Cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidates cache for this tenant
   */
  private async invalidateCache(): Promise<void> {
    if (!isRedisAvailable()) return;

    try {
      const redis = getRedisSafe();
      if (!redis) return;

      const pattern = `${CACHE_CONFIG.KEY_PREFIX}${this.config.tenantId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(keys);
        logger.info('[AdvisorEnhancedService] Cache invalidated', {
          tenantId: this.config.tenantId,
          keysDeleted: keys.length,
        });
      }
    } catch (error) {
      logger.warn('[AdvisorEnhancedService] Cache invalidation failed', {
        tenantId: this.config.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Converts category to summary key
   */
  private categoryToKey(
    category: string
  ): 'cost' | 'security' | 'reliability' | 'performance' | 'operationalExcellence' {
    const mapping: any = {
      Cost: 'cost',
      Security: 'security',
      Reliability: 'reliability',
      Performance: 'performance',
      OperationalExcellence: 'operationalExcellence',
    };
    return mapping[category] || 'operationalExcellence';
  }
}
