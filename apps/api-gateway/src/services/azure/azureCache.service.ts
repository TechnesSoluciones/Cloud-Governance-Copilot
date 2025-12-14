/**
 * Azure Cache Service
 * Provides Redis-based caching for Azure API responses
 * Reduces API calls, improves performance, and lowers costs
 */

import { getRedis } from '../../config/redis';
import { azureConfig } from '../../config/azure.config';
import { logger } from '../../utils/logger';

export type CacheCategory = 'resources' | 'costs' | 'security' | 'advisor' | 'metrics';

/**
 * Azure Cache Service
 *
 * Features:
 * - Automatic cache key generation with namespacing
 * - Configurable TTLs per resource type
 * - Pattern-based cache invalidation
 * - Cache hit/miss metrics logging
 * - Graceful degradation on cache failures
 */
export class AzureCacheService {
  private static readonly KEY_PREFIX = 'azure:cache';

  /**
   * Get TTL for a specific cache category
   */
  private static getCacheTTL(category: CacheCategory): number {
    return azureConfig.cacheTTL[category];
  }

  /**
   * Generate cache key with proper namespacing
   */
  private static generateCacheKey(
    category: CacheCategory,
    accountId: string,
    ...identifiers: string[]
  ): string {
    // Sanitize identifiers to prevent injection
    const sanitizedIds = identifiers.map((id) =>
      String(id).replace(/[^a-zA-Z0-9_-]/g, '_')
    );
    return `${this.KEY_PREFIX}:${category}:${accountId}:${sanitizedIds.join(':')}`;
  }

  /**
   * Get value from cache or fetch using provided function
   * Implements cache-aside pattern
   *
   * @param category - Cache category for TTL selection
   * @param accountId - Cloud account ID
   * @param identifiers - Additional identifiers for cache key
   * @param fetcher - Async function to fetch data on cache miss
   * @returns Cached or freshly fetched data
   */
  static async getOrSet<T>(
    category: CacheCategory,
    accountId: string,
    identifiers: string[],
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(category, accountId, ...identifiers);
    const ttl = this.getCacheTTL(category);

    try {
      const redis = getRedis();

      // Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug('Cache hit', {
          category,
          accountId,
          key: cacheKey,
        });

        try {
          return JSON.parse(cached) as T;
        } catch (parseError) {
          // Cache corrupted, delete and fetch fresh
          logger.warn('Cache parse error, invalidating', {
            key: cacheKey,
            error: parseError,
          });
          await redis.del(cacheKey);
        }
      }

      // Cache miss - fetch fresh data
      logger.debug('Cache miss', {
        category,
        accountId,
        key: cacheKey,
      });

      const data = await fetcher();

      // Store in cache (fire and forget - don't block on cache write)
      this.set(category, accountId, identifiers, data).catch((error) => {
        logger.error('Failed to write to cache', {
          key: cacheKey,
          error: error.message,
        });
      });

      return data;
    } catch (error: any) {
      // If cache is unavailable, fall back to fetcher
      logger.error('Cache error, falling back to fetcher', {
        category,
        accountId,
        error: error.message,
      });

      return await fetcher();
    }
  }

  /**
   * Set value in cache with automatic TTL
   *
   * @param category - Cache category for TTL selection
   * @param accountId - Cloud account ID
   * @param identifiers - Additional identifiers for cache key
   * @param data - Data to cache
   */
  static async set<T>(
    category: CacheCategory,
    accountId: string,
    identifiers: string[],
    data: T
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(category, accountId, ...identifiers);
    const ttl = this.getCacheTTL(category);

    try {
      const redis = getRedis();
      const serialized = JSON.stringify(data);

      await redis.setEx(cacheKey, ttl, serialized);

      logger.debug('Cache set', {
        category,
        accountId,
        key: cacheKey,
        ttl,
        sizeBytes: serialized.length,
      });
    } catch (error: any) {
      logger.error('Failed to set cache', {
        category,
        accountId,
        error: error.message,
      });
      // Don't throw - cache write failures should not break application
    }
  }

  /**
   * Get value from cache without fetching
   *
   * @param category - Cache category
   * @param accountId - Cloud account ID
   * @param identifiers - Additional identifiers for cache key
   * @returns Cached value or null
   */
  static async get<T>(
    category: CacheCategory,
    accountId: string,
    identifiers: string[]
  ): Promise<T | null> {
    const cacheKey = this.generateCacheKey(category, accountId, ...identifiers);

    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error: any) {
      logger.error('Failed to get from cache', {
        category,
        accountId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * Uses Redis SCAN to avoid blocking
   *
   * @param pattern - Redis key pattern (e.g., "azure:cache:resources:account123:*")
   */
  static async invalidate(pattern: string): Promise<void> {
    try {
      const redis = getRedis();

      // Ensure pattern is properly scoped to prevent accidents
      if (!pattern.startsWith(this.KEY_PREFIX)) {
        pattern = `${this.KEY_PREFIX}:${pattern}`;
      }

      logger.info('Invalidating cache', { pattern });

      // Use SCAN to avoid blocking Redis
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await redis.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);

      logger.info('Cache invalidated', {
        pattern,
        deletedCount,
      });
    } catch (error: any) {
      logger.error('Failed to invalidate cache', {
        pattern,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Invalidate all cache for a specific account
   *
   * @param accountId - Cloud account ID
   */
  static async invalidateAccount(accountId: string): Promise<void> {
    const pattern = `${this.KEY_PREFIX}:*:${accountId}:*`;
    await this.invalidate(pattern);
  }

  /**
   * Invalidate cache for specific category and account
   *
   * @param category - Cache category
   * @param accountId - Cloud account ID
   */
  static async invalidateCategory(
    category: CacheCategory,
    accountId: string
  ): Promise<void> {
    const pattern = `${this.KEY_PREFIX}:${category}:${accountId}:*`;
    await this.invalidate(pattern);
  }

  /**
   * Delete a specific cache entry
   *
   * @param category - Cache category
   * @param accountId - Cloud account ID
   * @param identifiers - Additional identifiers for cache key
   */
  static async delete(
    category: CacheCategory,
    accountId: string,
    identifiers: string[]
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(category, accountId, ...identifiers);

    try {
      const redis = getRedis();
      await redis.del(cacheKey);

      logger.debug('Cache entry deleted', {
        category,
        accountId,
        key: cacheKey,
      });
    } catch (error: any) {
      logger.error('Failed to delete cache entry', {
        category,
        accountId,
        error: error.message,
      });
    }
  }

  /**
   * Get cache statistics for monitoring
   *
   * @param accountId - Optional account ID filter
   * @returns Cache statistics
   */
  static async getStats(accountId?: string): Promise<{
    totalKeys: number;
    keysByCategory: Record<string, number>;
    estimatedSizeBytes: number;
  }> {
    try {
      const redis = getRedis();
      const pattern = accountId
        ? `${this.KEY_PREFIX}:*:${accountId}:*`
        : `${this.KEY_PREFIX}:*`;

      let cursor = 0;
      let totalKeys = 0;
      const keysByCategory: Record<string, number> = {};
      let estimatedSizeBytes = 0;

      do {
        const result = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        for (const key of keys) {
          totalKeys++;

          // Extract category from key
          const parts = key.split(':');
          if (parts.length >= 3) {
            const category = parts[2];
            keysByCategory[category] = (keysByCategory[category] || 0) + 1;
          }

          // Estimate size (this is a rough estimate)
          const value = await redis.get(key);
          if (value) {
            estimatedSizeBytes += value.length;
          }
        }
      } while (cursor !== 0);

      return {
        totalKeys,
        keysByCategory,
        estimatedSizeBytes,
      };
    } catch (error: any) {
      logger.error('Failed to get cache stats', {
        accountId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Warm up cache with commonly accessed data
   * Useful for reducing cold start latency
   *
   * @param category - Cache category
   * @param accountId - Cloud account ID
   * @param identifiers - Cache key identifiers
   * @param fetcher - Function to fetch data
   */
  static async warmUp<T>(
    category: CacheCategory,
    accountId: string,
    identifiers: string[],
    fetcher: () => Promise<T>
  ): Promise<void> {
    try {
      logger.info('Warming up cache', {
        category,
        accountId,
        identifiers,
      });

      // Use getOrSet to warm cache
      await this.getOrSet(category, accountId, identifiers, fetcher);
    } catch (error: any) {
      logger.error('Cache warm-up failed', {
        category,
        accountId,
        error: error.message,
      });
      // Don't throw - cache warm-up is not critical
    }
  }
}
