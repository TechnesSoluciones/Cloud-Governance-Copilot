/**
 * Azure Rate Limiter Service
 * Implements token bucket algorithm for distributed rate limiting using Redis
 * Prevents exceeding Azure API rate limits and ensures fair resource allocation
 */

import { getRedis } from '../../config/redis';
import { azureConfig } from '../../config/azure.config';
import { logger } from '../../utils/logger';

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until next request is allowed
  remainingTokens?: number;
}

/**
 * Azure Rate Limiter Service using Token Bucket Algorithm
 *
 * Implementation:
 * - Uses Redis for distributed rate limiting across multiple instances
 * - Token bucket algorithm allows burst traffic while maintaining average rate
 * - Separate limits per service type (Resource Graph, Cost Management, etc.)
 * - Per-account isolation to prevent noisy neighbor issues
 */
export class AzureRateLimiterService {
  private static readonly KEY_PREFIX = 'ratelimit:azure';
  private static readonly WINDOW_SIZE_MS = 1000; // 1 second window

  /**
   * Get rate limit configuration for a specific Azure service
   */
  private static getServiceConfig(service: string): RateLimitConfig {
    switch (service) {
      case 'resourceGraph':
        return azureConfig.rateLimit.resourceGraph;
      case 'costManagement':
        return azureConfig.rateLimit.costManagement;
      default:
        // Conservative default for unknown services
        return {
          requestsPerSecond: 5,
          burstSize: 10,
        };
    }
  }

  /**
   * Generate Redis key for rate limiting
   */
  private static getRateLimitKey(service: string, accountId: string): string {
    return `${this.KEY_PREFIX}:${service}:${accountId}`;
  }

  /**
   * Check if request is allowed under rate limit (without consuming token)
   * @param service - Azure service name (resourceGraph, costManagement, etc.)
   * @param accountId - Cloud account ID for isolation
   * @returns Rate limit check result
   */
  static async checkRateLimit(
    service: string,
    accountId: string
  ): Promise<RateLimitResult> {
    try {
      const redis = getRedis();
      const config = this.getServiceConfig(service);
      const key = this.getRateLimitKey(service, accountId);

      // Get current token count
      const tokenData = await redis.get(key);

      if (!tokenData) {
        // No tokens used yet - request is allowed
        return {
          allowed: true,
          remainingTokens: config.burstSize,
        };
      }

      const { tokens, lastRefill } = JSON.parse(tokenData);
      const now = Date.now();
      const timePassed = now - lastRefill;

      // Calculate tokens to add based on time passed
      const tokensToAdd = (timePassed / this.WINDOW_SIZE_MS) * config.requestsPerSecond;
      const currentTokens = Math.min(config.burstSize, tokens + tokensToAdd);

      if (currentTokens >= 1) {
        return {
          allowed: true,
          remainingTokens: Math.floor(currentTokens),
        };
      }

      // Calculate retry after time
      const tokensNeeded = 1 - currentTokens;
      const retryAfter = Math.ceil(
        (tokensNeeded / config.requestsPerSecond) * (this.WINDOW_SIZE_MS / 1000)
      );

      return {
        allowed: false,
        retryAfter,
        remainingTokens: 0,
      };
    } catch (error: any) {
      // Log error but allow request to proceed (fail open for availability)
      logger.error('Rate limit check failed:', {
        service,
        accountId,
        error: error.message,
      });

      return {
        allowed: true,
        remainingTokens: undefined,
      };
    }
  }

  /**
   * Consume a token from the rate limit bucket
   * This should be called AFTER successfully executing the API call
   * @param service - Azure service name
   * @param accountId - Cloud account ID
   */
  static async consumeToken(service: string, accountId: string): Promise<void> {
    try {
      const redis = getRedis();
      const config = this.getServiceConfig(service);
      const key = this.getRateLimitKey(service, accountId);
      const now = Date.now();

      // Use Redis transaction for atomic update
      const multi = redis.multi();

      // Get current state
      const tokenData = await redis.get(key);

      let newTokens: number;
      let lastRefill: number;

      if (!tokenData) {
        // First request - initialize with full bucket minus one
        newTokens = config.burstSize - 1;
        lastRefill = now;
      } else {
        const { tokens, lastRefill: prevRefill } = JSON.parse(tokenData);
        const timePassed = now - prevRefill;

        // Calculate tokens to add based on time passed
        const tokensToAdd = (timePassed / this.WINDOW_SIZE_MS) * config.requestsPerSecond;
        const currentTokens = Math.min(config.burstSize, tokens + tokensToAdd);

        // Consume one token
        newTokens = Math.max(0, currentTokens - 1);
        lastRefill = now;
      }

      // Update Redis with new token count
      const newData = JSON.stringify({
        tokens: newTokens,
        lastRefill,
      });

      // Set with TTL of 2x the time to refill full bucket (for cleanup)
      const ttl = Math.ceil((config.burstSize / config.requestsPerSecond) * 2);

      multi.set(key, newData, { EX: ttl });
      await multi.exec();

      logger.debug('Rate limit token consumed', {
        service,
        accountId,
        remainingTokens: newTokens,
      });
    } catch (error: any) {
      // Log error but don't throw - rate limiting is not critical path
      logger.error('Failed to consume rate limit token:', {
        service,
        accountId,
        error: error.message,
      });
    }
  }

  /**
   * Wait until a request is allowed under rate limit
   * Automatically retries with exponential backoff
   * @param service - Azure service name
   * @param accountId - Cloud account ID
   * @param maxWaitSeconds - Maximum time to wait (default: 30s)
   */
  static async waitForRateLimit(
    service: string,
    accountId: string,
    maxWaitSeconds: number = 30
  ): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
      const result = await this.checkRateLimit(service, accountId);

      if (result.allowed) {
        return;
      }

      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds >= maxWaitSeconds) {
        throw new Error(
          `Rate limit exceeded for ${service} (account: ${accountId}). Maximum wait time reached.`
        );
      }

      // Calculate wait time with exponential backoff
      const waitTime = result.retryAfter
        ? result.retryAfter * 1000
        : Math.min(1000 * Math.pow(2, attempt), 5000);

      logger.warn('Rate limit reached, waiting...', {
        service,
        accountId,
        waitTimeMs: waitTime,
        attempt: attempt + 1,
      });

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      attempt++;
    }
  }

  /**
   * Reset rate limit for a specific service and account
   * Useful for testing or manual intervention
   * @param service - Azure service name
   * @param accountId - Cloud account ID
   */
  static async resetRateLimit(service: string, accountId: string): Promise<void> {
    try {
      const redis = getRedis();
      const key = this.getRateLimitKey(service, accountId);
      await redis.del(key);

      logger.info('Rate limit reset', { service, accountId });
    } catch (error: any) {
      logger.error('Failed to reset rate limit:', {
        service,
        accountId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get current rate limit status for monitoring
   * @param service - Azure service name
   * @param accountId - Cloud account ID
   * @returns Current token count and configuration
   */
  static async getRateLimitStatus(
    service: string,
    accountId: string
  ): Promise<{
    currentTokens: number;
    maxTokens: number;
    requestsPerSecond: number;
    utilizationPercent: number;
  }> {
    try {
      const redis = getRedis();
      const config = this.getServiceConfig(service);
      const key = this.getRateLimitKey(service, accountId);

      const tokenData = await redis.get(key);

      if (!tokenData) {
        return {
          currentTokens: config.burstSize,
          maxTokens: config.burstSize,
          requestsPerSecond: config.requestsPerSecond,
          utilizationPercent: 0,
        };
      }

      const { tokens, lastRefill } = JSON.parse(tokenData);
      const now = Date.now();
      const timePassed = now - lastRefill;

      // Calculate current tokens
      const tokensToAdd = (timePassed / this.WINDOW_SIZE_MS) * config.requestsPerSecond;
      const currentTokens = Math.min(config.burstSize, tokens + tokensToAdd);

      return {
        currentTokens: Math.floor(currentTokens),
        maxTokens: config.burstSize,
        requestsPerSecond: config.requestsPerSecond,
        utilizationPercent: Math.round(
          ((config.burstSize - currentTokens) / config.burstSize) * 100
        ),
      };
    } catch (error: any) {
      logger.error('Failed to get rate limit status:', {
        service,
        accountId,
        error: error.message,
      });
      throw error;
    }
  }
}
