import { logger } from './logger.service';

/**
 * Error Tracking Service
 *
 * Prepares for error tracking service integration (Sentry, DataDog, etc.):
 * - Error capture with context
 * - User context attachment
 * - Breadcrumbs for debugging
 * - Environment and release tagging
 * - Configuration via environment variables
 *
 * Features:
 * - Zero-dependency mode for local development
 * - Graceful degradation if tracking service unavailable
 * - Support for multiple error tracking providers
 * - TypeScript-safe error handling
 */

/**
 * Supported error tracking providers
 */
export type ErrorTrackingProvider = 'sentry' | 'datadog' | 'none';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'warn' | 'info' | 'debug';

/**
 * User context for error tracking
 */
export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  cloudAccountId?: string;
}

/**
 * Error context for tracking
 */
export interface ErrorContext {
  /**
   * User who encountered the error
   */
  user?: UserContext;

  /**
   * Request metadata
   */
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    body?: Record<string, any>;
  };

  /**
   * Additional tags for filtering
   */
  tags?: Record<string, string | number | boolean>;

  /**
   * Extra context data
   */
  extra?: Record<string, any>;

  /**
   * Severity level
   */
  level?: ErrorSeverity;
}

/**
 * Breadcrumb for debugging
 */
export interface Breadcrumb {
  type?: string;
  category?: string;
  message: string;
  data?: Record<string, any>;
  level?: ErrorSeverity;
  timestamp?: number;
}

/**
 * Error Tracking Configuration
 */
interface ErrorTrackingConfig {
  enabled: boolean;
  provider: ErrorTrackingProvider;
  dsn?: string;
  environment: string;
  release?: string;
  sampleRate: number;
  maxBreadcrumbs: number;
  attachStacktrace: boolean;
  beforeSend?: (error: Error, context?: ErrorContext) => boolean;
}

/**
 * Error Tracking Service Class
 */
class ErrorTrackingService {
  private config: ErrorTrackingConfig;
  private providerClient: any;
  private breadcrumbs: Breadcrumb[] = [];
  private initialized: boolean = false;

  constructor() {
    this.config = this.loadConfig();

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): ErrorTrackingConfig {
    return {
      enabled: process.env.ERROR_TRACKING_ENABLED === 'true',
      provider: (process.env.ERROR_TRACKING_PROVIDER as ErrorTrackingProvider) || 'none',
      dsn: process.env.SENTRY_DSN || process.env.DATADOG_API_KEY,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
      sampleRate: parseFloat(process.env.ERROR_TRACKING_SAMPLE_RATE || '1.0'),
      maxBreadcrumbs: parseInt(process.env.ERROR_TRACKING_MAX_BREADCRUMBS || '100', 10),
      attachStacktrace: process.env.ERROR_TRACKING_ATTACH_STACKTRACE !== 'false',
    };
  }

  /**
   * Initialize error tracking provider
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      switch (this.config.provider) {
        case 'sentry':
          this.initializeSentry();
          break;
        case 'datadog':
          this.initializeDatadog();
          break;
        default:
          logger.info('Error tracking provider not configured, using fallback mode');
      }

      this.initialized = true;
    } catch (error) {
      logger.warn('Failed to initialize error tracking provider', {
        provider: this.config.provider,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      // Graceful degradation - continue without error tracking
      this.config.enabled = false;
    }
  }

  /**
   * Initialize Sentry client
   */
  private initializeSentry(): void {
    try {
      // Try to load @sentry/node
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node');

      if (!this.config.dsn) {
        throw new Error('Sentry DSN not configured');
      }

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate,
        maxBreadcrumbs: this.config.maxBreadcrumbs,
        attachStacktrace: this.config.attachStacktrace,
        beforeSend: (event: any, hint: any) => {
          // Custom filtering logic
          if (this.config.beforeSend) {
            const error = hint.originalException;
            const shouldSend = this.config.beforeSend(error, {});
            return shouldSend ? event : null;
          }
          return event;
        },
      });

      this.providerClient = Sentry;
      logger.info('Sentry error tracking initialized', {
        environment: this.config.environment,
        release: this.config.release,
      });
    } catch (error) {
      if ((error as any).code === 'MODULE_NOT_FOUND') {
        logger.info('Sentry package not installed, skipping initialization');
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize DataDog client
   */
  private initializeDatadog(): void {
    try {
      // Try to load dd-trace
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tracer = require('dd-trace');

      tracer.init({
        env: this.config.environment,
        version: this.config.release,
      });

      this.providerClient = tracer;
      logger.info('DataDog error tracking initialized', {
        environment: this.config.environment,
        release: this.config.release,
      });
    } catch (error) {
      if ((error as any).code === 'MODULE_NOT_FOUND') {
        logger.info('DataDog package not installed, skipping initialization');
      } else {
        throw error;
      }
    }
  }

  /**
   * Capture an error
   */
  public captureError(error: Error, context?: ErrorContext): string | null {
    // Always log the error
    logger.error('Error captured', {
      error,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context?.extra,
      userId: context?.user?.id,
      tags: context?.tags,
    });

    if (!this.config.enabled || !this.providerClient) {
      return null;
    }

    try {
      if (this.config.provider === 'sentry') {
        return this.captureSentryError(error, context);
      } else if (this.config.provider === 'datadog') {
        return this.captureDatadogError(error, context);
      }
    } catch (err) {
      logger.warn('Failed to send error to tracking provider', {
        error: err instanceof Error ? err : new Error('Unknown error'),
      });
    }

    return null;
  }

  /**
   * Capture error with Sentry
   */
  private captureSentryError(error: Error, context?: ErrorContext): string {
    const Sentry = this.providerClient;

    // Set user context
    if (context?.user) {
      Sentry.setUser({
        id: context.user.id,
        email: context.user.email,
        username: context.user.username,
      });
    }

    // Set tags
    if (context?.tags) {
      Sentry.setTags(context.tags);
    }

    // Set extra context
    if (context?.extra) {
      Sentry.setExtras(context.extra);
    }

    // Add breadcrumbs
    this.breadcrumbs.forEach((breadcrumb) => {
      Sentry.addBreadcrumb({
        type: breadcrumb.type,
        category: breadcrumb.category,
        message: breadcrumb.message,
        data: breadcrumb.data,
        level: breadcrumb.level,
        timestamp: breadcrumb.timestamp,
      });
    });

    // Capture the error
    return Sentry.captureException(error, {
      level: context?.level || 'error',
    });
  }

  /**
   * Capture error with DataDog
   */
  private captureDatadogError(error: Error, context?: ErrorContext): string {
    const tracer = this.providerClient;
    const span = tracer.scope().active();

    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.setTag('error.stack', error.stack);

      if (context?.user) {
        span.setTag('user.id', context.user.id);
        span.setTag('user.email', context.user.email);
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          span.setTag(key, value);
        });
      }
    }

    return 'datadog-trace-id';
  }

  /**
   * Capture a message
   */
  public captureMessage(
    message: string,
    level: ErrorSeverity = 'info',
    context?: ErrorContext
  ): string | null {
    // Log the message at appropriate level
    switch (level) {
      case 'error':
        logger.error(message, context?.extra);
        break;
      case 'warn':
      case 'warning':
        logger.warn(message, context?.extra);
        break;
      case 'info':
        logger.info(message, context?.extra);
        break;
      case 'debug':
        logger.debug(message, context?.extra);
        break;
      default:
        logger.info(message, context?.extra);
    }

    if (!this.config.enabled || !this.providerClient) {
      return null;
    }

    if (this.config.provider === 'sentry') {
      const Sentry = this.providerClient;

      if (context?.user) {
        Sentry.setUser(context.user);
      }

      if (context?.tags) {
        Sentry.setTags(context.tags);
      }

      if (context?.extra) {
        Sentry.setExtras(context.extra);
      }

      return Sentry.captureMessage(message, level);
    }

    return null;
  }

  /**
   * Add a breadcrumb
   */
  public addBreadcrumb(breadcrumb: Breadcrumb): void {
    // Add timestamp if not provided
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || Date.now(),
    };

    // Store in local array
    this.breadcrumbs.push(fullBreadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Send to provider
    if (this.config.enabled && this.config.provider === 'sentry' && this.providerClient) {
      this.providerClient.addBreadcrumb(fullBreadcrumb);
    }
  }

  /**
   * Set user context
   */
  public setUser(user: UserContext | null): void {
    if (!this.config.enabled || !this.providerClient) {
      return;
    }

    if (this.config.provider === 'sentry') {
      this.providerClient.setUser(user);
    }
  }

  /**
   * Set custom tag
   */
  public setTag(key: string, value: string | number | boolean): void {
    if (!this.config.enabled || !this.providerClient) {
      return;
    }

    if (this.config.provider === 'sentry') {
      this.providerClient.setTag(key, value);
    }
  }

  /**
   * Set multiple custom tags
   */
  public setTags(tags: Record<string, string | number | boolean>): void {
    if (!this.config.enabled || !this.providerClient) {
      return;
    }

    if (this.config.provider === 'sentry') {
      this.providerClient.setTags(tags);
    }
  }

  /**
   * Set custom context
   */
  public setContext(name: string, context: Record<string, any>): void {
    if (!this.config.enabled || !this.providerClient) {
      return;
    }

    if (this.config.provider === 'sentry') {
      this.providerClient.setContext(name, context);
    }
  }

  /**
   * Clear breadcrumbs
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Flush pending events (useful before shutdown)
   */
  public async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.config.enabled || !this.providerClient) {
      return true;
    }

    try {
      if (this.config.provider === 'sentry') {
        return await this.providerClient.close(timeout);
      }
      return true;
    } catch (error) {
      logger.warn('Failed to flush error tracking events', {
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      return false;
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): Readonly<ErrorTrackingConfig> {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

// Export class for testing
export { ErrorTrackingService };
