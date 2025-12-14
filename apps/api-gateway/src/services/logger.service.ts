import * as winston from 'winston';
import * as path from 'path';

// Logger configuration interface
export interface LoggerConfig {
  level: string;
  format: 'json' | 'pretty';
  filePath?: string;
  enableConsole: boolean;
  enableFile: boolean;
  service: string;
  environment: string;
}

// Contextual metadata for structured logging
export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  cloudAccountId?: string;
  subscriptionId?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  error?: Error;
  [key: string]: any;
}

/**
 * Structured Logger Service
 *
 * Features:
 * - Structured JSON output for production
 * - Pretty formatting for development
 * - Multiple log levels: error, warn, info, debug
 * - Contextual information (userId, requestId, etc.)
 * - Multiple transports (console, file, cloud logging)
 * - Zero-dependency mode for local development
 */
class LoggerService {
  private logger: winston.Logger;
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env.LOG_LEVEL || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'pretty') || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty'),
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      service: process.env.SERVICE_NAME || 'api-gateway',
      environment: process.env.NODE_ENV || 'development',
      ...config,
    };

    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance with configured transports
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(this.createConsoleTransport());
    }

    // File transports
    if (this.config.enableFile) {
      transports.push(...this.createFileTransports());
    }

    return winston.createLogger({
      level: this.config.level,
      format: this.createBaseFormat(),
      defaultMeta: {
        service: this.config.service,
        environment: this.config.environment,
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid,
      },
      transports,
      // Prevent logger from exiting on error
      exitOnError: false,
    });
  }

  /**
   * Create base log format with timestamp and metadata
   */
  private createBaseFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      // Add metadata fields
      winston.format((info) => {
        // Extract error information if present
        if (info.error instanceof Error) {
          info.errorMessage = info.error.message;
          info.errorStack = info.error.stack;
          info.errorName = info.error.name;
        }
        return info;
      })(),
      this.config.format === 'json'
        ? winston.format.json()
        : this.createPrettyFormat()
    );
  }

  /**
   * Create pretty format for development
   */
  private createPrettyFormat(): winston.Logform.Format {
    return winston.format.printf((info) => {
      const {
        timestamp,
        level,
        message,
        service,
        requestId,
        userId,
        duration,
        statusCode,
        operation,
        errorMessage,
        errorStack,
        ...meta
      } = info as any;

      // Build log line components
      const parts: string[] = [
        timestamp,
        `[${service}]`,
        level.toUpperCase(),
      ];

      // Add request ID if present
      if (requestId) {
        parts.push(`[req:${String(requestId).substring(0, 8)}]`);
      }

      // Add user ID if present
      if (userId) {
        parts.push(`[user:${String(userId)}]`);
      }

      // Add operation if present
      if (operation) {
        parts.push(`[${operation}]`);
      }

      // Add message
      parts.push(message);

      // Add duration if present
      if (duration !== undefined) {
        parts.push(`(${duration}ms)`);
      }

      // Add status code if present
      if (statusCode !== undefined) {
        parts.push(`[${statusCode}]`);
      }

      let logLine = parts.join(' ');

      // Add error stack if present
      if (errorStack) {
        logLine += `\n${errorStack}`;
      }

      // Add remaining metadata
      const remainingMeta = { ...meta };
      // Remove default meta fields
      delete remainingMeta.service;
      delete remainingMeta.environment;
      delete remainingMeta.hostname;
      delete remainingMeta.pid;
      delete remainingMeta.timestamp;
      delete remainingMeta.level;

      if (Object.keys(remainingMeta).length > 0) {
        logLine += `\n${JSON.stringify(remainingMeta, null, 2)}`;
      }

      return logLine;
    });
  }

  /**
   * Create console transport with colorization
   */
  private createConsoleTransport(): winston.transport {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: this.config.format === 'pretty' }),
        this.config.format === 'json'
          ? winston.format.json()
          : this.createPrettyFormat()
      ),
    });
  }

  /**
   * Create file transports (error and combined logs)
   */
  private createFileTransports(): winston.transport[] {
    const logDir = path.dirname(this.config.filePath!);
    const transports: winston.transport[] = [];

    try {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: this.config.filePath,
          format: winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
          ),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
          ),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        })
      );
    } catch (error) {
      // If file transport fails, log to console only
      console.warn('Failed to initialize file logging:', error);
    }

    return transports;
  }

  /**
   * Log with context - merges context into log metadata
   */
  private logWithContext(level: string, message: string, context?: LogContext): void {
    const meta: any = { ...context };

    // Extract error if present
    if (context?.error) {
      meta.error = context.error;
      if (!meta.errorMessage) {
        meta.errorMessage = context.error.message;
      }
    }

    this.logger.log(level, message, meta);
  }

  /**
   * Error level logging
   */
  public error(message: string, context?: LogContext): void {
    this.logWithContext('error', message, context);
  }

  /**
   * Warning level logging
   */
  public warn(message: string, context?: LogContext): void {
    this.logWithContext('warn', message, context);
  }

  /**
   * Info level logging
   */
  public info(message: string, context?: LogContext): void {
    this.logWithContext('info', message, context);
  }

  /**
   * Debug level logging
   */
  public debug(message: string, context?: LogContext): void {
    this.logWithContext('debug', message, context);
  }

  /**
   * Create a child logger with default context
   */
  public child(defaultContext: LogContext): LoggerService {
    const childLogger = new LoggerService(this.config);

    // Override log methods to include default context
    const originalError = childLogger.error.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalDebug = childLogger.debug.bind(childLogger);

    childLogger.error = (message: string, context?: LogContext) => {
      originalError(message, { ...defaultContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalWarn(message, { ...defaultContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalInfo(message, { ...defaultContext, ...context });
    };

    childLogger.debug = (message: string, context?: LogContext) => {
      originalDebug(message, { ...defaultContext, ...context });
    };

    return childLogger;
  }

  /**
   * Get underlying Winston logger instance
   */
  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export class for testing
export { LoggerService };
