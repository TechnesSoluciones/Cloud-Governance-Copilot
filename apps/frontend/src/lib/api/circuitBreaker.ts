/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking request failures and temporarily
 * blocking requests when a service is experiencing issues (rate limiting,
 * service unavailable, etc.)
 *
 * Circuit States:
 * - CLOSED (normal): Requests flow through normally
 * - OPEN (blocking): Too many failures, block requests temporarily
 * - HALF_OPEN (testing): After timeout, allow test request to check recovery
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening circuit (default: 3) */
  failureThreshold?: number;
  /** Time in ms to wait before attempting recovery (default: 60000 = 1 minute) */
  resetTimeout?: number;
  /** HTTP status codes that should trigger circuit breaker (default: [429, 500, 502, 503, 504]) */
  errorCodes?: number[];
  /** Name identifier for this circuit (for logging/debugging) */
  name?: string;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly errorCodes: Set<number>;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeout = options.resetTimeout ?? 60000; // 1 minute default
    this.errorCodes = new Set(options.errorCodes ?? [429, 500, 502, 503, 504]);
    this.name = options.name ?? 'default';
  }

  /**
   * Check if request should be allowed through the circuit
   */
  public canRequest(): boolean {
    const now = Date.now();

    // If circuit is CLOSED, allow all requests
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    // If circuit is OPEN, check if reset timeout has elapsed
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttemptTime && now >= this.nextAttemptTime) {
        // Transition to HALF_OPEN to test if service recovered
        this.state = CircuitState.HALF_OPEN;
        this.log('Circuit transitioning to HALF_OPEN (testing recovery)');
        return true;
      }
      // Circuit still OPEN, block request
      this.log('Circuit is OPEN, blocking request');
      return false;
    }

    // If circuit is HALF_OPEN, allow the test request
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    return false;
  }

  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    const previousState = this.state;

    // Reset failure count and close circuit on success
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.log('Circuit CLOSED (service recovered)', { previousState });
    }

    // If already CLOSED, nothing to do
  }

  /**
   * Record a failed request
   * @param statusCode - HTTP status code of the failure
   */
  public recordFailure(statusCode?: number): void {
    const now = Date.now();

    // Only count failures that match configured error codes
    if (statusCode && !this.errorCodes.has(statusCode)) {
      // This is a client error (4xx) or other error that shouldn't trip circuit
      return;
    }

    this.failureCount++;
    this.lastFailureTime = now;

    this.log('Failure recorded', {
      failureCount: this.failureCount,
      statusCode,
      threshold: this.failureThreshold
    });

    // If in HALF_OPEN state and request fails, immediately re-open circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
      return;
    }

    // Check if we've hit failure threshold
    if (this.failureCount >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit (block future requests)
   */
  private openCircuit(): void {
    const now = Date.now();
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = now + this.resetTimeout;

    const resetIn = Math.round(this.resetTimeout / 1000);
    this.log(`Circuit OPENED (will attempt recovery in ${resetIn}s)`, {
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
    });
  }

  /**
   * Get current circuit state (for monitoring/debugging)
   */
  public getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset the circuit (for testing or admin override)
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.log('Circuit manually RESET');
  }

  /**
   * Log circuit breaker events (only in development)
   */
  private log(message: string, data?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CircuitBreaker:${this.name}] ${message}`, data ?? '');
    }
  }
}

/**
 * Global circuit breaker instance for Azure API
 */
export const azureApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  errorCodes: [429, 500, 502, 503, 504],
  name: 'AzureAPI',
});

/**
 * Circuit Breaker Error
 * Thrown when circuit is open and request is blocked
 */
export class CircuitBreakerError extends Error {
  public readonly nextAttemptTime: number | null;
  public readonly name = 'CircuitBreakerError';

  constructor(circuitName: string, nextAttemptTime: number | null) {
    const waitTime = nextAttemptTime ? Math.round((nextAttemptTime - Date.now()) / 1000) : 60;
    super(
      `Circuit breaker is OPEN for ${circuitName}. Service is experiencing issues. ` +
      `Will retry in approximately ${waitTime} seconds.`
    );
    this.nextAttemptTime = nextAttemptTime;
  }
}

/**
 * Check if error is a circuit breaker error
 */
export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}
