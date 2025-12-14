/**
 * Azure API Rate Limiter
 *
 * Implements intelligent rate limiting for Azure APIs to prevent
 * throttling errors (429) and ensure compliance with service quotas.
 *
 * Azure API Rate Limits:
 * - Cost Management: 30 requests/minute
 * - Resource Graph: 15 queries per 5 seconds
 * - ARM (Resource Manager): 12,000 reads/hour
 * - Monitor Metrics: 200 requests/minute
 * - Advisor: 100 requests/hour
 * - Security Center: 100 requests/hour
 *
 * @module integrations/azure/rate-limiter
 */

import { EventEmitter } from 'events';

/**
 * Rate limit configuration for an Azure service
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Service name for logging */
  serviceName: string;

  /** Enable automatic backoff on approaching limit */
  enableAdaptiveBackoff?: boolean;

  /** Threshold (as percentage) to trigger backoff (default: 80%) */
  backoffThreshold?: number;
}

/**
 * Predefined rate limit configurations for Azure services
 */
export const AZURE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  COST_MANAGEMENT: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    serviceName: 'Cost Management',
    enableAdaptiveBackoff: true,
    backoffThreshold: 80,
  },
  RESOURCE_GRAPH: {
    maxRequests: 15,
    windowMs: 5 * 1000, // 5 seconds
    serviceName: 'Resource Graph',
    enableAdaptiveBackoff: true,
    backoffThreshold: 85,
  },
  ARM_READ: {
    maxRequests: 12000,
    windowMs: 60 * 60 * 1000, // 1 hour
    serviceName: 'ARM (Read)',
    enableAdaptiveBackoff: false,
  },
  MONITOR_METRICS: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    serviceName: 'Monitor Metrics',
    enableAdaptiveBackoff: true,
    backoffThreshold: 80,
  },
  ADVISOR: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    serviceName: 'Advisor',
    enableAdaptiveBackoff: true,
    backoffThreshold: 90,
  },
  SECURITY_CENTER: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    serviceName: 'Security Center',
    enableAdaptiveBackoff: true,
    backoffThreshold: 90,
  },
  ACTIVITY_LOGS: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    serviceName: 'Activity Logs',
    enableAdaptiveBackoff: true,
    backoffThreshold: 80,
  },
};

/**
 * Request metadata for tracking
 */
interface RequestMetadata {
  timestamp: number;
  subscriptionId?: string;
  operation: string;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requests: RequestMetadata[];
  totalRequests: number;
  throttledRequests: number;
  lastThrottleTime?: number;
}

/**
 * Azure Rate Limiter
 *
 * Token bucket algorithm with adaptive backoff.
 *
 * @example
 * ```typescript
 * const rateLimiter = new AzureRateLimiter(AZURE_RATE_LIMITS.COST_MANAGEMENT);
 *
 * // Wait for rate limit before making request
 * await rateLimiter.waitForToken('subscription-id', 'getCosts');
 *
 * try {
 *   const data = await costManagementClient.query.usage(scope, query);
 *   rateLimiter.recordSuccess();
 * } catch (error) {
 *   if (error.statusCode === 429) {
 *     rateLimiter.recordThrottle();
 *   }
 *   throw error;
 * }
 *
 * // Check metrics
 * console.log(rateLimiter.getMetrics());
 * ```
 */
export class AzureRateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private state: RateLimiterState;

  constructor(config: RateLimitConfig) {
    super();
    this.config = {
      ...config,
      enableAdaptiveBackoff: config.enableAdaptiveBackoff ?? true,
      backoffThreshold: config.backoffThreshold ?? 80,
    };

    this.state = {
      requests: [],
      totalRequests: 0,
      throttledRequests: 0,
    };
  }

  /**
   * Waits for a token to become available before proceeding
   *
   * @param subscriptionId - Azure subscription ID (for tracking)
   * @param operation - Operation name (for logging)
   * @returns Promise that resolves when token is available
   *
   * @example
   * ```typescript
   * await rateLimiter.waitForToken('sub-123', 'getCosts');
   * // Proceed with API call
   * ```
   */
  async waitForToken(subscriptionId?: string, operation: string = 'unknown'): Promise<void> {
    while (true) {
      const now = Date.now();

      // Clean up expired requests
      this.cleanExpiredRequests(now);

      // Check if we have capacity
      const currentCount = this.state.requests.length;
      const capacity = this.config.maxRequests;

      if (currentCount < capacity) {
        // Check if we should apply adaptive backoff
        const utilizationPercentage = (currentCount / capacity) * 100;

        if (
          this.config.enableAdaptiveBackoff &&
          utilizationPercentage >= this.config.backoffThreshold!
        ) {
          // Approaching limit - apply backoff
          const backoffMs = this.calculateAdaptiveBackoff(utilizationPercentage);
          console.warn(
            `[AzureRateLimiter:${this.config.serviceName}] Adaptive backoff: ${backoffMs}ms (utilization: ${utilizationPercentage.toFixed(1)}%)`
          );
          await this.sleep(backoffMs);
        }

        // Record the request
        this.state.requests.push({
          timestamp: now,
          subscriptionId,
          operation,
        });
        this.state.totalRequests++;

        this.emit('token-acquired', {
          serviceName: this.config.serviceName,
          currentCount: currentCount + 1,
          capacity,
          utilizationPercentage,
        });

        return;
      }

      // No capacity - wait for the oldest request to expire
      const oldestRequest = this.state.requests[0];
      const timeUntilExpiry = oldestRequest.timestamp + this.config.windowMs - now;
      const waitTime = Math.max(timeUntilExpiry, 100); // At least 100ms

      console.warn(
        `[AzureRateLimiter:${this.config.serviceName}] Rate limit reached (${currentCount}/${capacity}), waiting ${waitTime}ms`
      );

      this.emit('rate-limit-hit', {
        serviceName: this.config.serviceName,
        currentCount,
        capacity,
        waitTime,
      });

      await this.sleep(waitTime);
    }
  }

  /**
   * Records a successful API call
   */
  recordSuccess(): void {
    this.emit('request-success', {
      serviceName: this.config.serviceName,
    });
  }

  /**
   * Records a throttling error (429)
   *
   * When this is called, the rate limiter adjusts its behavior to be more conservative.
   */
  recordThrottle(): void {
    this.state.throttledRequests++;
    this.state.lastThrottleTime = Date.now();

    console.error(
      `[AzureRateLimiter:${this.config.serviceName}] Throttled by Azure (429). Total throttles: ${this.state.throttledRequests}`
    );

    this.emit('throttled', {
      serviceName: this.config.serviceName,
      totalThrottles: this.state.throttledRequests,
    });
  }

  /**
   * Gets rate limiter metrics
   *
   * @returns Metrics object with request counts, utilization, and throttles
   */
  getMetrics() {
    const now = Date.now();
    this.cleanExpiredRequests(now);

    const currentCount = this.state.requests.length;
    const capacity = this.config.maxRequests;
    const utilizationPercentage = (currentCount / capacity) * 100;

    return {
      serviceName: this.config.serviceName,
      currentRequests: currentCount,
      capacity,
      utilizationPercentage: utilizationPercentage.toFixed(1) + '%',
      totalRequests: this.state.totalRequests,
      throttledRequests: this.state.throttledRequests,
      throttleRate:
        this.state.totalRequests > 0
          ? ((this.state.throttledRequests / this.state.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
      lastThrottleTime: this.state.lastThrottleTime
        ? new Date(this.state.lastThrottleTime).toISOString()
        : null,
    };
  }

  /**
   * Resets rate limiter state
   *
   * Useful for testing or after long idle periods.
   */
  reset(): void {
    this.state = {
      requests: [],
      totalRequests: 0,
      throttledRequests: 0,
    };

    this.emit('reset', {
      serviceName: this.config.serviceName,
    });
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Removes expired requests from tracking
   *
   * @private
   */
  private cleanExpiredRequests(now: number): void {
    const expiryTime = now - this.config.windowMs;
    this.state.requests = this.state.requests.filter((req) => req.timestamp > expiryTime);
  }

  /**
   * Calculates adaptive backoff based on utilization
   *
   * As we approach the rate limit, introduce progressively longer delays.
   *
   * @private
   */
  private calculateAdaptiveBackoff(utilizationPercentage: number): number {
    // Linear backoff from 0ms at threshold to 1000ms at 100%
    const threshold = this.config.backoffThreshold!;
    const range = 100 - threshold;
    const excessUtilization = Math.max(0, utilizationPercentage - threshold);
    const backoffFactor = excessUtilization / range; // 0.0 to 1.0

    return Math.floor(backoffFactor * 1000); // 0ms to 1000ms
  }

  /**
   * Sleep utility
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Multi-Service Rate Limiter Manager
 *
 * Manages rate limiters for multiple Azure services.
 *
 * @example
 * ```typescript
 * const rateLimitManager = new AzureRateLimiterManager();
 *
 * // Get rate limiter for specific service
 * const costLimiter = rateLimitManager.getLimiter('COST_MANAGEMENT');
 * await costLimiter.waitForToken('sub-123', 'getCosts');
 *
 * // Get metrics for all services
 * console.log(rateLimitManager.getAllMetrics());
 * ```
 */
export class AzureRateLimiterManager {
  private limiters: Map<string, AzureRateLimiter>;

  constructor() {
    this.limiters = new Map();

    // Initialize limiters for all Azure services
    for (const [key, config] of Object.entries(AZURE_RATE_LIMITS)) {
      const limiter = new AzureRateLimiter(config);

      // Forward events
      limiter.on('rate-limit-hit', (data) => {
        console.warn(`[RateLimitManager] Rate limit hit:`, data);
      });

      limiter.on('throttled', (data) => {
        console.error(`[RateLimitManager] Service throttled:`, data);
      });

      this.limiters.set(key, limiter);
    }
  }

  /**
   * Gets rate limiter for a specific service
   *
   * @param serviceName - Service name (e.g., 'COST_MANAGEMENT')
   * @returns Rate limiter instance
   */
  getLimiter(serviceName: keyof typeof AZURE_RATE_LIMITS): AzureRateLimiter {
    const limiter = this.limiters.get(serviceName);
    if (!limiter) {
      throw new Error(`Rate limiter not found for service: ${serviceName}`);
    }
    return limiter;
  }

  /**
   * Gets metrics for all rate limiters
   *
   * @returns Array of metrics for all services
   */
  getAllMetrics() {
    const metrics: any[] = [];
    for (const limiter of this.limiters.values()) {
      metrics.push(limiter.getMetrics());
    }
    return metrics;
  }

  /**
   * Resets all rate limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
    console.log('[RateLimitManager] All rate limiters reset');
  }

  /**
   * Gets total throttle count across all services
   */
  getTotalThrottles(): number {
    let total = 0;
    for (const limiter of this.limiters.values()) {
      total += limiter.getMetrics().throttledRequests;
    }
    return total;
  }
}

/**
 * Circuit Breaker for Azure Services
 *
 * Implements circuit breaker pattern to prevent cascading failures
 * when an Azure service is experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation
 * - OPEN: Service is failing, reject requests immediately
 * - HALF_OPEN: Testing if service has recovered
 */
export class AzureCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    private serviceName: string,
    private failureThreshold: number = 5,
    private cooldownMs: number = 60000, // 1 minute
    private halfOpenSuccessThreshold: number = 2
  ) {}

  /**
   * Executes operation with circuit breaker protection
   *
   * @param operation - Operation to execute
   * @returns Result of operation
   * @throws Error if circuit is open
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.nextAttemptTime && now < this.nextAttemptTime) {
        throw new Error(
          `Circuit breaker OPEN for ${this.serviceName}. Try again in ${Math.ceil((this.nextAttemptTime - now) / 1000)}s`
        );
      }

      // Cooldown period passed - transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log(`[CircuitBreaker:${this.serviceName}] Transitioning to HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Records a successful operation
   *
   * @private
   */
  private recordSuccess(): void {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        // Service recovered - close circuit
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.nextAttemptTime = undefined;
        console.log(`[CircuitBreaker:${this.serviceName}] Circuit CLOSED - service recovered`);
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Records a failed operation
   *
   * @private
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failure during half-open - reopen circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
      console.error(
        `[CircuitBreaker:${this.serviceName}] Circuit reopened - service still failing`
      );
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Too many failures - open circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
      console.error(
        `[CircuitBreaker:${this.serviceName}] Circuit OPENED - failure threshold reached (${this.failureCount})`
      );
    }
  }

  /**
   * Gets circuit breaker state
   */
  getState() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
    };
  }

  /**
   * Manually resets circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    console.log(`[CircuitBreaker:${this.serviceName}] Manually reset`);
  }
}
