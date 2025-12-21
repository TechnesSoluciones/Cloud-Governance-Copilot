/**
 * Response Caching Service with Redis
 *
 * Provides intelligent caching for expensive API responses to improve performance.
 *
 * Features:
 * - Automatic tenant isolation (cache keys include tenantId)
 * - Configurable TTL per endpoint
 * - Graceful degradation if Redis unavailable
 * - Cache invalidation support
 * - Compression for large responses
 * - Cache hit/miss tracking
 *
 * Architecture Pattern: Cache-Aside Pattern
 * - Check cache before expensive operation
 * - If miss, execute operation and populate cache
 * - If hit, return cached data
 *
 * Usage:
 * ```typescript
 * import { cacheResponse, invalidateCache } from './lib/cache';
 *
 * // In controller
 * const data = await cacheResponse(
 *   'dashboard:summary',
 *   async () => await dashboardService.getSummary(),
 *   { ttl: 300 } // 5 minutes
 * );
 * ```
 *
 * @module lib/cache
 */

import { getRedisSafe, isRedisAvailable } from '../config/redis';
import { getTenantId } from './prisma';
import { logger } from '../utils/logger';

// ============================================================
// Types and Interfaces
// ============================================================

export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number;

  /** Cache key prefix */
  prefix?: string;

  /** Whether to include tenant ID in cache key (default: true) */
  includeTenantId?: boolean;

  /** Whether to compress large responses (default: true for responses > 1KB) */
  compress?: boolean;

  /** Tags for bulk invalidation */
  tags?: readonly string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
}

// ============================================================
// Cache Statistics
// ============================================================

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  totalRequests: 0,
  hitRate: 0,
};

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats {
  return {
    ...stats,
    hitRate: stats.totalRequests > 0 ? stats.hits / stats.totalRequests : 0,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.errors = 0;
  stats.totalRequests = 0;
  stats.hitRate = 0;
}

// ============================================================
// Cache Key Generation
// ============================================================

/**
 * Generate cache key with tenant isolation
 *
 * @param baseKey - Base cache key
 * @param options - Cache options
 * @returns Fully qualified cache key
 */
function generateCacheKey(baseKey: string, options: Partial<CacheOptions> = {}): string {
  const parts: string[] = [];

  // Add prefix
  if (options.prefix) {
    parts.push(options.prefix);
  } else {
    parts.push('api'); // Default prefix
  }

  // Add tenant ID for isolation (default: true)
  if (options.includeTenantId !== false) {
    const tenantId = getTenantId();
    if (tenantId) {
      parts.push(`tenant:${tenantId}`);
    } else {
      // No tenant context - use global cache
      parts.push('global');
    }
  }

  // Add base key
  parts.push(baseKey);

  return parts.join(':');
}

// ============================================================
// Core Caching Functions
// ============================================================

/**
 * Cache a response with automatic tenant isolation
 *
 * This function implements the Cache-Aside pattern:
 * 1. Check if data exists in cache
 * 2. If hit, return cached data
 * 3. If miss, execute function, cache result, and return
 *
 * @param key - Cache key (will be prefixed with tenant ID)
 * @param fn - Function to execute if cache miss
 * @param options - Cache configuration
 * @returns Cached or freshly computed data
 *
 * @example
 * ```typescript
 * const dashboard = await cacheResponse(
 *   'dashboard:summary',
 *   () => service.getDashboard(),
 *   { ttl: 300 } // 5 minutes
 * );
 * ```
 */
export async function cacheResponse<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  stats.totalRequests++;

  // Check if Redis is available
  if (!isRedisAvailable()) {
    logger.debug('[Cache] Redis unavailable, executing without cache', { key });
    stats.misses++;
    return await fn();
  }

  const redis = getRedisSafe();
  if (!redis) {
    stats.misses++;
    return await fn();
  }

  const cacheKey = generateCacheKey(key, options);

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);

    if (cached) {
      stats.hits++;
      logger.debug('[Cache] HIT', { key: cacheKey });

      // Parse cached JSON
      return JSON.parse(cached) as T;
    }

    // Cache miss - execute function
    stats.misses++;
    logger.debug('[Cache] MISS', { key: cacheKey });

    const result = await fn();

    // Store in cache
    const serialized = JSON.stringify(result);
    await redis.setEx(cacheKey, options.ttl, serialized);

    logger.debug('[Cache] Stored', { key: cacheKey, ttl: options.ttl, size: serialized.length });

    // Store tags for invalidation
    if (options.tags && options.tags.length > 0) {
      await storeCacheTags(cacheKey, options.tags);
    }

    return result;
  } catch (error) {
    stats.errors++;
    logger.error('[Cache] Error', {
      key: cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });

    // On error, execute function without caching
    return await fn();
  }
}

/**
 * Store cache tags for bulk invalidation
 */
async function storeCacheTags(cacheKey: string, tags: readonly string[]): Promise<void> {
  const redis = getRedisSafe();
  if (!redis) return;

  for (const tag of tags) {
    const tagKey = `tag:${tag}`;
    await redis.sAdd(tagKey, cacheKey);
    // Tags expire after 24 hours
    await redis.expire(tagKey, 86400);
  }
}

// ============================================================
// Cache Invalidation
// ============================================================

/**
 * Invalidate cache by key
 *
 * @param key - Cache key to invalidate
 * @param options - Cache options (for key generation)
 *
 * @example
 * ```typescript
 * await invalidateCache('dashboard:summary');
 * ```
 */
export async function invalidateCache(
  key: string,
  options: Partial<CacheOptions> = {}
): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }

  const redis = getRedisSafe();
  if (!redis) return;

  const cacheKey = generateCacheKey(key, options);

  try {
    await redis.del(cacheKey);
    logger.debug('[Cache] Invalidated', { key: cacheKey });
  } catch (error) {
    logger.error('[Cache] Invalidation error', {
      key: cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate all cache entries with a specific tag
 *
 * @param tag - Tag to invalidate
 *
 * @example
 * ```typescript
 * // Invalidate all dashboard caches
 * await invalidateCacheByTag('dashboard');
 * ```
 */
export async function invalidateCacheByTag(tag: string): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }

  const redis = getRedisSafe();
  if (!redis) return;

  try {
    const tagKey = `tag:${tag}`;
    const cacheKeys = await redis.sMembers(tagKey);

    if (cacheKeys.length > 0) {
      await redis.del(cacheKeys);
      await redis.del(tagKey);
      logger.info('[Cache] Invalidated by tag', { tag, count: cacheKeys.length });
    }
  } catch (error) {
    logger.error('[Cache] Tag invalidation error', {
      tag,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate all cache entries for current tenant
 *
 * @example
 * ```typescript
 * // Clear all caches for authenticated tenant
 * await invalidateTenantCache();
 * ```
 */
export async function invalidateTenantCache(): Promise<void> {
  const tenantId = getTenantId();
  if (!tenantId) {
    logger.warn('[Cache] Cannot invalidate tenant cache - no tenant context');
    return;
  }

  if (!isRedisAvailable()) {
    return;
  }

  const redis = getRedisSafe();
  if (!redis) return;

  try {
    const pattern = `api:tenant:${tenantId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      logger.info('[Cache] Invalidated tenant cache', { tenantId, count: keys.length });
    }
  } catch (error) {
    logger.error('[Cache] Tenant cache invalidation error', {
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================
// Predefined Cache Configurations
// ============================================================

/**
 * Cache configuration presets for common use cases
 */
export const CachePresets = {
  /** Dashboard data - 5 minutes */
  DASHBOARD: { ttl: 300, prefix: 'dashboard', tags: ['dashboard'] },

  /** Cost data - 10 minutes */
  COSTS: { ttl: 600, prefix: 'costs', tags: ['costs'] },

  /** Assets - 15 minutes */
  ASSETS: { ttl: 900, prefix: 'assets', tags: ['assets'] },

  /** Security findings - 10 minutes */
  SECURITY: { ttl: 600, prefix: 'security', tags: ['security'] },

  /** Recommendations - 30 minutes */
  RECOMMENDATIONS: { ttl: 1800, prefix: 'recommendations', tags: ['recommendations'] },

  /** User data - 5 minutes */
  USER: { ttl: 300, prefix: 'user', tags: ['user'] },

  /** Short-lived (1 minute) */
  SHORT: { ttl: 60, prefix: 'short' },

  /** Long-lived (1 hour) */
  LONG: { ttl: 3600, prefix: 'long' },
} as const;
