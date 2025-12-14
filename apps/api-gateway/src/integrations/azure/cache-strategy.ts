/**
 * Azure Cache Strategy
 *
 * Implements intelligent caching for Azure API responses to minimize
 * API calls, reduce costs, and improve response times.
 *
 * Cache TTLs are based on data freshness requirements:
 * - Resource inventory: 15 minutes (changes infrequently)
 * - Cost data: 1 hour (updated daily by Azure)
 * - Security findings: 5 minutes (critical, needs frequent updates)
 * - Advisor recommendations: 24 hours (updated daily)
 * - Metrics: 1-5 minutes (depending on time granularity)
 *
 * @module integrations/azure/cache-strategy
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

/**
 * Cache key prefixes for different Azure services
 */
export const CACHE_PREFIXES = {
  RESOURCE_GRAPH: 'azure:rg',
  COST_MANAGEMENT: 'azure:cost',
  ADVISOR: 'azure:advisor',
  SECURITY_CENTER: 'azure:security',
  MONITOR_METRICS: 'azure:metrics',
  ACTIVITY_LOGS: 'azure:activity',
  SUBSCRIPTIONS: 'azure:subs',
} as const;

/**
 * Cache TTLs in seconds
 */
export const CACHE_TTL = {
  // Resource Graph
  RESOURCE_INVENTORY: 15 * 60, // 15 minutes
  RESOURCE_DETAILS: 10 * 60, // 10 minutes
  RESOURCE_QUERY: 5 * 60, // 5 minutes (generic queries)

  // Cost Management
  COST_DATA_DAILY: 60 * 60, // 1 hour (Azure updates daily)
  COST_DATA_MONTHLY: 24 * 60 * 60, // 24 hours
  COST_BY_SERVICE: 2 * 60 * 60, // 2 hours

  // Advisor
  ADVISOR_RECOMMENDATIONS: 24 * 60 * 60, // 24 hours
  ADVISOR_COST: 12 * 60 * 60, // 12 hours
  ADVISOR_SECURITY: 6 * 60 * 60, // 6 hours

  // Security Center
  SECURITY_SCORE: 6 * 60 * 60, // 6 hours
  SECURITY_ASSESSMENTS: 5 * 60, // 5 minutes
  COMPLIANCE_RESULTS: 12 * 60 * 60, // 12 hours

  // Monitor
  METRICS_1MIN: 1 * 60, // 1 minute
  METRICS_5MIN: 3 * 60, // 3 minutes
  METRICS_1HOUR: 15 * 60, // 15 minutes
  ACTIVITY_LOGS: 5 * 60, // 5 minutes
  ALERT_RULES: 30 * 60, // 30 minutes
  ACTIVE_ALERTS: 1 * 60, // 1 minute (critical)

  // Subscriptions
  SUBSCRIPTION_LIST: 60 * 60, // 1 hour
  SUBSCRIPTION_DETAILS: 30 * 60, // 30 minutes
} as const;

/**
 * Cache configuration
 */
export interface AzureCacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  enableCompression?: boolean;
  enableLogging?: boolean;
}

/**
 * Cache options for individual operations
 */
export interface CacheOptions {
  ttl?: number;
  skipCache?: boolean;
  forceRefresh?: boolean;
}

/**
 * Azure Cache Service
 *
 * Provides intelligent caching for Azure API responses with automatic
 * invalidation, compression, and monitoring.
 *
 * @example
 * ```typescript
 * const cacheService = new AzureCacheService({
 *   redis: {
 *     host: process.env.REDIS_HOST!,
 *     port: parseInt(process.env.REDIS_PORT!),
 *     password: process.env.REDIS_PASSWORD,
 *   },
 *   enableCompression: true,
 *   enableLogging: true,
 * });
 *
 * await cacheService.connect();
 *
 * // Cache resource graph query
 * const data = await cacheService.getOrSet(
 *   CACHE_PREFIXES.RESOURCE_GRAPH,
 *   'all-vms',
 *   async () => {
 *     // Expensive API call
 *     return await resourceGraphService.getAllVirtualMachines();
 *   },
 *   { ttl: CACHE_TTL.RESOURCE_INVENTORY }
 * );
 * ```
 */
export class AzureCacheService {
  private client: RedisClientType;
  private config: AzureCacheConfig;
  private isConnected: boolean = false;

  // Cache hit/miss metrics
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
  };

  constructor(config: AzureCacheConfig) {
    this.config = config;

    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db || 0,
    });

    this.client.on('error', (err) => {
      console.error('[AzureCacheService] Redis error:', err);
      this.metrics.errors++;
    });

    this.client.on('connect', () => {
      console.log('[AzureCacheService] Connected to Redis');
    });

    this.client.on('reconnecting', () => {
      console.warn('[AzureCacheService] Reconnecting to Redis...');
    });
  }

  /**
   * Connects to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  /**
   * Disconnects from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Gets cached data or sets it by calling the provider function
   *
   * @param prefix - Cache key prefix
   * @param key - Cache key (will be hashed)
   * @param provider - Function to call if cache miss
   * @param options - Cache options (TTL, skip cache, force refresh)
   * @returns Cached or fresh data
   *
   * @example
   * ```typescript
   * const vms = await cacheService.getOrSet(
   *   CACHE_PREFIXES.RESOURCE_GRAPH,
   *   `vms:${subscriptionId}`,
   *   () => resourceGraphService.getAllVirtualMachines(),
   *   { ttl: CACHE_TTL.RESOURCE_INVENTORY }
   * );
   * ```
   */
  async getOrSet<T>(
    prefix: string,
    key: string,
    provider: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Skip cache if requested
    if (options.skipCache) {
      return provider();
    }

    const cacheKey = this.buildCacheKey(prefix, key);

    // Force refresh - delete existing cache
    if (options.forceRefresh) {
      await this.delete(cacheKey);
    }

    // Try to get from cache
    try {
      const cached = await this.get<T>(cacheKey);
      if (cached !== null) {
        this.metrics.hits++;
        if (this.config.enableLogging) {
          console.log(`[AzureCacheService] Cache HIT: ${cacheKey}`);
        }
        return cached;
      }
    } catch (error) {
      console.error(`[AzureCacheService] Cache get error for ${cacheKey}:`, error);
      this.metrics.errors++;
      // Continue to fetch fresh data
    }

    // Cache miss - fetch fresh data
    this.metrics.misses++;
    if (this.config.enableLogging) {
      console.log(`[AzureCacheService] Cache MISS: ${cacheKey}`);
    }

    const data = await provider();

    // Store in cache
    try {
      await this.set(cacheKey, data, options.ttl);
    } catch (error) {
      console.error(`[AzureCacheService] Cache set error for ${cacheKey}:`, error);
      this.metrics.errors++;
      // Don't fail the request, just return data without caching
    }

    return data;
  }

  /**
   * Gets data from cache
   *
   * @param key - Full cache key
   * @returns Cached data or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[AzureCacheService] JSON parse error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Sets data in cache
   *
   * @param key - Full cache key
   * @param value - Data to cache
   * @param ttl - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await this.client.setEx(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Deletes data from cache
   *
   * @param key - Full cache key or pattern
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Deletes all keys matching a pattern
   *
   * @param pattern - Redis pattern (e.g., "azure:rg:*")
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await this.client.del(keys);
    return keys.length;
  }

  /**
   * Invalidates cache for a specific tenant
   *
   * @param tenantId - Tenant ID
   * @param prefix - Optional prefix to limit invalidation
   */
  async invalidateTenant(tenantId: string, prefix?: string): Promise<number> {
    const pattern = prefix ? `${prefix}:${tenantId}:*` : `*:${tenantId}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Invalidates cache for a specific subscription
   *
   * @param subscriptionId - Azure subscription ID
   * @param prefix - Optional prefix to limit invalidation
   */
  async invalidateSubscription(subscriptionId: string, prefix?: string): Promise<number> {
    const pattern = prefix ? `${prefix}:*:${subscriptionId}:*` : `*:${subscriptionId}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Gets cache statistics
   *
   * @returns Cache hit/miss metrics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      total,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  /**
   * Resets cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
    };
  }

  /**
   * Builds a cache key from prefix and key
   *
   * Keys are hashed to avoid Redis key length limits and special characters.
   *
   * @private
   */
  private buildCacheKey(prefix: string, key: string): string {
    const hash = createHash('sha256').update(key).digest('hex').substring(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Checks if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client.isReady;
  }
}

/**
 * Cache invalidation utilities
 */
export class AzureCacheInvalidator {
  constructor(private cache: AzureCacheService) {}

  /**
   * Invalidates cost data cache
   *
   * Call this when:
   * - New cost data is imported
   * - Cost anomalies are detected
   */
  async invalidateCostData(tenantId: string, subscriptionId?: string): Promise<number> {
    let deletedCount = 0;

    if (subscriptionId) {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.COST_MANAGEMENT}:${tenantId}:${subscriptionId}:*`
      );
    } else {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.COST_MANAGEMENT}:${tenantId}:*`
      );
    }

    console.log(`[AzureCacheInvalidator] Invalidated ${deletedCount} cost cache entries`);
    return deletedCount;
  }

  /**
   * Invalidates resource cache
   *
   * Call this when:
   * - Resources are created/deleted/updated
   * - Asset discovery completes
   */
  async invalidateResources(tenantId: string, subscriptionId?: string): Promise<number> {
    let deletedCount = 0;

    if (subscriptionId) {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.RESOURCE_GRAPH}:${tenantId}:${subscriptionId}:*`
      );
    } else {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.RESOURCE_GRAPH}:${tenantId}:*`
      );
    }

    console.log(`[AzureCacheInvalidator] Invalidated ${deletedCount} resource cache entries`);
    return deletedCount;
  }

  /**
   * Invalidates security cache
   *
   * Call this when:
   * - Security scan completes
   * - Security findings are updated
   */
  async invalidateSecurity(tenantId: string, subscriptionId?: string): Promise<number> {
    let deletedCount = 0;

    if (subscriptionId) {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.SECURITY_CENTER}:${tenantId}:${subscriptionId}:*`
      );
    } else {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.SECURITY_CENTER}:${tenantId}:*`
      );
    }

    console.log(`[AzureCacheInvalidator] Invalidated ${deletedCount} security cache entries`);
    return deletedCount;
  }

  /**
   * Invalidates advisor recommendations cache
   *
   * Call this when:
   * - New recommendations are generated
   * - Recommendations are suppressed/resolved
   */
  async invalidateAdvisor(tenantId: string, subscriptionId?: string): Promise<number> {
    let deletedCount = 0;

    if (subscriptionId) {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.ADVISOR}:${tenantId}:${subscriptionId}:*`
      );
    } else {
      deletedCount = await this.cache.deletePattern(
        `${CACHE_PREFIXES.ADVISOR}:${tenantId}:*`
      );
    }

    console.log(`[AzureCacheInvalidator] Invalidated ${deletedCount} advisor cache entries`);
    return deletedCount;
  }

  /**
   * Invalidates all cache for a tenant
   *
   * Use sparingly - only when absolutely necessary (e.g., tenant deletion).
   */
  async invalidateAllForTenant(tenantId: string): Promise<number> {
    const deletedCount = await this.cache.invalidateTenant(tenantId);
    console.log(
      `[AzureCacheInvalidator] Invalidated ${deletedCount} total cache entries for tenant ${tenantId}`
    );
    return deletedCount;
  }
}
