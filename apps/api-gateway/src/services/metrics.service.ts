import { logger } from './logger.service';

/**
 * Metrics Service
 *
 * Implements metrics collection with graceful degradation:
 * - Uses prom-client if installed for Prometheus-compatible metrics
 * - Falls back to in-memory metrics if prom-client unavailable
 * - Zero-dependency mode for local development
 * - Minimal performance overhead
 *
 * Metrics tracked:
 * - HTTP request metrics (count, duration, status codes)
 * - Azure API call metrics (success rate, latency)
 * - Database query metrics (slow queries, connection pool)
 * - Redis cache metrics (hit rate, misses)
 * - Custom business metrics
 */

// Type definitions for prom-client (optional dependency)
interface PrometheusClient {
  Counter: any;
  Histogram: any;
  Gauge: any;
  register: any;
  collectDefaultMetrics: any;
}

// In-memory metrics storage
interface InMemoryMetric {
  type: 'counter' | 'histogram' | 'gauge';
  value: number;
  values?: number[]; // For histograms
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsService {
  private promClient?: PrometheusClient;
  private enabled: boolean;
  private usePrometheus: boolean;
  private inMemoryMetrics: Map<string, InMemoryMetric> = new Map();

  // Prometheus metrics
  private httpRequestDuration?: any;
  private httpRequestTotal?: any;
  private httpRequestErrors?: any;
  private azureApiCalls?: any;
  private azureApiDuration?: any;
  private azureApiErrors?: any;
  private databaseQueryDuration?: any;
  private databaseSlowQueries?: any;
  private redisOperations?: any;
  private redisCacheHits?: any;
  private redisCacheMisses?: any;
  private businessMetrics?: Map<string, any>;

  constructor() {
    this.enabled = process.env.METRICS_ENABLED !== 'false';
    this.usePrometheus = false;
    this.businessMetrics = new Map();

    if (this.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize metrics service
   */
  private initialize(): void {
    try {
      // Try to load prom-client
      this.promClient = require('prom-client') as PrometheusClient;
      this.usePrometheus = true;
      this.initializePrometheusMetrics();
      logger.info('Metrics service initialized with Prometheus support');
    } catch (error) {
      // prom-client not installed, use in-memory metrics
      this.usePrometheus = false;
      logger.info('Metrics service initialized in fallback mode (prom-client not installed)');
    }
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializePrometheusMetrics(): void {
    if (!this.promClient) return;

    const { Counter, Histogram, Gauge, collectDefaultMetrics } = this.promClient;

    // Collect default Node.js metrics
    collectDefaultMetrics({
      prefix: 'api_gateway_',
    });

    // HTTP Request Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });

    // Azure API Metrics
    this.azureApiCalls = new Counter({
      name: 'azure_api_calls_total',
      help: 'Total number of Azure API calls',
      labelNames: ['service', 'operation', 'status'],
    });

    this.azureApiDuration = new Histogram({
      name: 'azure_api_duration_seconds',
      help: 'Duration of Azure API calls in seconds',
      labelNames: ['service', 'operation'],
      buckets: [0.5, 1, 2, 5, 10, 30],
    });

    this.azureApiErrors = new Counter({
      name: 'azure_api_errors_total',
      help: 'Total number of Azure API errors',
      labelNames: ['service', 'operation', 'error_type'],
    });

    // Database Metrics
    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.databaseSlowQueries = new Counter({
      name: 'database_slow_queries_total',
      help: 'Total number of slow database queries (>1s)',
      labelNames: ['operation', 'model'],
    });

    // Redis Cache Metrics
    this.redisOperations = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status'],
    });

    this.redisCacheHits = new Counter({
      name: 'redis_cache_hits_total',
      help: 'Total number of Redis cache hits',
      labelNames: ['key_prefix'],
    });

    this.redisCacheMisses = new Counter({
      name: 'redis_cache_misses_total',
      help: 'Total number of Redis cache misses',
      labelNames: ['key_prefix'],
    });
  }

  /**
   * Record HTTP request metrics
   */
  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number
  ): void {
    if (!this.enabled) return;

    const durationSeconds = durationMs / 1000;

    if (this.usePrometheus) {
      this.httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        durationSeconds
      );
      this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    } else {
      // In-memory fallback
      this.incrementInMemoryCounter('http_requests_total', {
        method,
        route,
        status_code: statusCode.toString(),
      });
      this.recordInMemoryHistogram('http_request_duration_seconds', durationSeconds, {
        method,
        route,
        status_code: statusCode.toString(),
      });
    }
  }

  /**
   * Record HTTP request error
   */
  public recordHttpError(method: string, route: string, errorType: string): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      this.httpRequestErrors.inc({ method, route, error_type: errorType });
    } else {
      this.incrementInMemoryCounter('http_request_errors_total', {
        method,
        route,
        error_type: errorType,
      });
    }
  }

  /**
   * Record Azure API call metrics
   */
  public recordAzureApiCall(
    service: string,
    operation: string,
    status: 'success' | 'error',
    durationMs: number
  ): void {
    if (!this.enabled) return;

    const durationSeconds = durationMs / 1000;

    if (this.usePrometheus) {
      this.azureApiCalls.inc({ service, operation, status });
      this.azureApiDuration.observe({ service, operation }, durationSeconds);
    } else {
      this.incrementInMemoryCounter('azure_api_calls_total', {
        service,
        operation,
        status,
      });
      this.recordInMemoryHistogram('azure_api_duration_seconds', durationSeconds, {
        service,
        operation,
      });
    }
  }

  /**
   * Record Azure API error
   */
  public recordAzureApiError(
    service: string,
    operation: string,
    errorType: string
  ): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      this.azureApiErrors.inc({ service, operation, error_type: errorType });
    } else {
      this.incrementInMemoryCounter('azure_api_errors_total', {
        service,
        operation,
        error_type: errorType,
      });
    }
  }

  /**
   * Record database query metrics
   */
  public recordDatabaseQuery(
    operation: string,
    model: string,
    durationMs: number
  ): void {
    if (!this.enabled) return;

    const durationSeconds = durationMs / 1000;

    if (this.usePrometheus) {
      this.databaseQueryDuration.observe({ operation, model }, durationSeconds);

      // Track slow queries (>1 second)
      if (durationMs > 1000) {
        this.databaseSlowQueries.inc({ operation, model });
      }
    } else {
      this.recordInMemoryHistogram('database_query_duration_seconds', durationSeconds, {
        operation,
        model,
      });

      if (durationMs > 1000) {
        this.incrementInMemoryCounter('database_slow_queries_total', {
          operation,
          model,
        });
      }
    }
  }

  /**
   * Record Redis cache hit
   */
  public recordCacheHit(keyPrefix: string): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      this.redisCacheHits.inc({ key_prefix: keyPrefix });
      this.redisOperations.inc({ operation: 'get', status: 'hit' });
    } else {
      this.incrementInMemoryCounter('redis_cache_hits_total', {
        key_prefix: keyPrefix,
      });
    }
  }

  /**
   * Record Redis cache miss
   */
  public recordCacheMiss(keyPrefix: string): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      this.redisCacheMisses.inc({ key_prefix: keyPrefix });
      this.redisOperations.inc({ operation: 'get', status: 'miss' });
    } else {
      this.incrementInMemoryCounter('redis_cache_misses_total', {
        key_prefix: keyPrefix,
      });
    }
  }

  /**
   * Record custom business metric (counter)
   */
  public incrementBusinessMetric(
    name: string,
    labels?: Record<string, string>,
    value: number = 1
  ): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      let counter = this.businessMetrics!.get(name);
      if (!counter) {
        const { Counter } = this.promClient!;
        counter = new Counter({
          name: `business_${name}_total`,
          help: `Business metric: ${name}`,
          labelNames: labels ? Object.keys(labels) : [],
        });
        this.businessMetrics!.set(name, counter);
      }
      counter.inc(labels || {}, value);
    } else {
      this.incrementInMemoryCounter(`business_${name}_total`, labels, value);
    }
  }

  /**
   * Record custom business metric (gauge)
   */
  public setBusinessGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.enabled) return;

    if (this.usePrometheus) {
      let gauge = this.businessMetrics!.get(name);
      if (!gauge) {
        const { Gauge } = this.promClient!;
        gauge = new Gauge({
          name: `business_${name}`,
          help: `Business metric: ${name}`,
          labelNames: labels ? Object.keys(labels) : [],
        });
        this.businessMetrics!.set(name, gauge);
      }
      gauge.set(labels || {}, value);
    } else {
      this.setInMemoryGauge(`business_${name}`, value, labels);
    }
  }

  /**
   * Get Prometheus metrics (for /metrics endpoint)
   */
  public async getMetrics(): Promise<string> {
    if (!this.enabled) {
      return '# Metrics disabled\n';
    }

    if (this.usePrometheus && this.promClient) {
      return this.promClient.register.metrics();
    } else {
      // Return in-memory metrics in Prometheus format
      return this.formatInMemoryMetrics();
    }
  }

  /**
   * Get metrics content type
   */
  public getContentType(): string {
    if (this.usePrometheus && this.promClient) {
      return this.promClient.register.contentType;
    }
    return 'text/plain; version=0.0.4; charset=utf-8';
  }

  // In-memory metrics helpers

  private incrementInMemoryCounter(
    name: string,
    labels?: Record<string, string>,
    value: number = 1
  ): void {
    const key = this.buildMetricKey(name, labels);
    const existing = this.inMemoryMetrics.get(key);

    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.inMemoryMetrics.set(key, {
        type: 'counter',
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  private recordInMemoryHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.buildMetricKey(name, labels);
    const existing = this.inMemoryMetrics.get(key);

    if (existing) {
      existing.values = existing.values || [];
      existing.values.push(value);
      existing.value = value; // Store last value
      existing.timestamp = Date.now();
    } else {
      this.inMemoryMetrics.set(key, {
        type: 'histogram',
        value,
        values: [value],
        labels,
        timestamp: Date.now(),
      });
    }
  }

  private setInMemoryGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.buildMetricKey(name, labels);
    this.inMemoryMetrics.set(key, {
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  private buildMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private formatInMemoryMetrics(): string {
    let output = '# In-memory metrics (prom-client not installed)\n\n';

    for (const [key, metric] of Array.from(this.inMemoryMetrics.entries())) {
      if (metric.type === 'counter') {
        output += `${key} ${metric.value}\n`;
      } else if (metric.type === 'histogram' && metric.values) {
        const sum = metric.values.reduce((a, b) => a + b, 0);
        const count = metric.values.length;
        output += `${key}_sum ${sum}\n`;
        output += `${key}_count ${count}\n`;
      } else if (metric.type === 'gauge') {
        output += `${key} ${metric.value}\n`;
      }
    }

    return output;
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clear(): void {
    this.inMemoryMetrics.clear();
    if (this.usePrometheus && this.promClient) {
      this.promClient.register.clear();
      this.initializePrometheusMetrics();
    }
  }
}

// Export singleton instance
export const metricsService = new MetricsService();

// Export class for testing
export { MetricsService };
