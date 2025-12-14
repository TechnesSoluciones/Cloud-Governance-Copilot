import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * Redis Client Configuration
 * Used for caching, session storage, and temporary data
 *
 * Features:
 * - Non-blocking initialization with intelligent retry logic
 * - Exponential backoff: 1s → 2s → 4s → 8s → 15s (cap at 15s)
 * - Graceful degradation: server starts even if Redis is unavailable
 * - Self-healing: automatic recovery when Redis becomes available
 * - State management: tracks connection status transitions
 */

// Connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

// Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;

// Connection state tracking
let connectionState: ConnectionState = 'disconnected';
let retryCount = 0;
let connectionStartTime: number | null = null;
let lastError: string | null = null;

// Event emitter for connection state changes
const connectionEvents = new EventEmitter();

// Sleep utility
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to Redis with exponential backoff retry logic
 *
 * @param isStartup - True if called during server startup (limited retries), false for runtime (infinite retries)
 */
async function connectWithRetry(isStartup: boolean = true): Promise<void> {
  const maxRetries = isStartup ? 20 : Infinity;
  let currentDelay = 1000; // Start with 1 second
  retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      connectionState = 'connecting';
      connectionEvents.emit('state-change', connectionState);

      if (!redisClient) {
        throw new Error('Redis client not initialized');
      }

      await redisClient.connect();

      // Success!
      connectionState = 'connected';
      connectionStartTime = Date.now();
      lastError = null;
      connectionEvents.emit('state-change', connectionState);

      logger.info('Redis: Connected successfully', {
        retryCount,
        totalAttemptTime: connectionStartTime ? Date.now() - connectionStartTime : 0,
      });

      return;
    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;

      if (retryCount >= maxRetries) {
        if (isStartup) {
          connectionState = 'failed';
          connectionEvents.emit('state-change', connectionState);

          logger.warn('Redis: Max startup retries reached, continuing without Redis', {
            retryCount,
            lastError: errorMessage,
            mode: 'degraded',
          });
          return; // Don't throw - allow server to start in degraded mode
        }

        connectionState = 'failed';
        connectionEvents.emit('state-change', connectionState);
        throw error; // Runtime: should never reach here due to Infinity
      }

      logger.warn(`Redis: Connection attempt ${retryCount}/${isStartup ? maxRetries : '∞'} failed, retrying in ${currentDelay}ms`, {
        error: errorMessage,
        nextRetry: currentDelay,
      });

      await sleep(currentDelay);

      // Exponential backoff with cap at 15 seconds
      currentDelay = Math.min(currentDelay * 2, 15000);
    }
  }
}

/**
 * Initialize Redis connection (non-blocking)
 * This function sets up the Redis client and attempts to connect,
 * but does NOT throw errors to prevent server startup failures.
 */
export const initRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    logger.info('Redis: Initializing client', { url: redisUrl.replace(/:[^:]*@/, ':****@') });

    redisClient = createClient({
      url: redisUrl,
      socket: {
        // Runtime reconnection strategy (after initial connection is established)
        reconnectStrategy: (retries) => {
          if (retries > 50) {
            logger.error('Redis: Max runtime reconnection attempts reached');
            return new Error('Max runtime reconnection attempts reached');
          }

          // Exponential backoff for runtime reconnections
          const delay = Math.min(Math.pow(2, Math.min(retries, 4)) * 1000, 15000);
          logger.warn(`Redis: Runtime reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
    });

    // Event handlers
    redisClient.on('error', (err) => {
      lastError = err.message;
      logger.error('Redis Client Error:', {
        error: err,
        connectionState,
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis: Connection initiated');
    });

    redisClient.on('ready', () => {
      connectionState = 'connected';
      lastError = null;
      connectionEvents.emit('state-change', connectionState);
      logger.info('Redis: Ready to accept commands');
    });

    redisClient.on('reconnecting', () => {
      connectionState = 'connecting';
      connectionEvents.emit('state-change', connectionState);
      logger.warn('Redis: Reconnecting after connection loss');
    });

    redisClient.on('end', () => {
      connectionState = 'disconnected';
      connectionEvents.emit('state-change', connectionState);
      logger.warn('Redis: Connection ended');
    });

    // Attempt initial connection with retry logic (non-blocking)
    connectionStartTime = Date.now();
    await connectWithRetry(true); // isStartup = true

  } catch (error) {
    // This catch block should rarely be hit due to non-throwing connectWithRetry
    const errorMessage = error instanceof Error ? error.message : String(error);
    lastError = errorMessage;
    connectionState = 'failed';

    logger.error('Redis initialization failed:', {
      error,
      message: 'Server will continue in degraded mode',
    });

    // DO NOT THROW - allow server to start in degraded mode
  }
};

/**
 * Check if Redis is currently available
 * Use this for quick availability checks before attempting operations
 */
export const isRedisAvailable = (): boolean => {
  return connectionState === 'connected' && redisClient?.isOpen === true;
};

/**
 * Get Redis health status for monitoring and health checks
 */
export const getRedisHealthStatus = () => {
  const uptime = connectionStartTime && connectionState === 'connected'
    ? Date.now() - connectionStartTime
    : undefined;

  return {
    status: connectionState,
    isOpen: redisClient?.isOpen ?? false,
    details: {
      retryCount,
      lastError,
      uptime,
      url: process.env.REDIS_URL ? '***configured***' : 'default',
    },
  };
};

/**
 * Get Redis client instance
 * Throws if Redis is not available - use isRedisAvailable() first for safety
 */
export const getRedis = (): ReturnType<typeof createClient> => {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client is not initialized or connected');
  }
  return redisClient;
};

/**
 * Get Redis client instance with graceful degradation
 * Returns null if Redis is not available instead of throwing
 */
export const getRedisSafe = (): ReturnType<typeof createClient> | null => {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

/**
 * Set value in Redis with optional TTL
 * Throws if Redis is not available
 */
export const setRedisValue = async (
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> => {
  const client = getRedis(); // This will throw if Redis unavailable
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
};

/**
 * Get value from Redis
 * Throws if Redis is not available
 */
export const getRedisValue = async (key: string): Promise<string | null> => {
  const client = getRedis(); // This will throw if Redis unavailable
  return await client.get(key);
};

/**
 * Delete value from Redis
 * Throws if Redis is not available
 */
export const deleteRedisValue = async (key: string): Promise<void> => {
  const client = getRedis(); // This will throw if Redis unavailable
  await client.del(key);
};

/**
 * Check if key exists in Redis
 * Throws if Redis is not available
 */
export const redisKeyExists = async (key: string): Promise<boolean> => {
  const client = getRedis(); // This will throw if Redis unavailable
  const exists = await client.exists(key);
  return exists === 1;
};

/**
 * Get TTL of a key in Redis (seconds)
 * Throws if Redis is not available
 */
export const getRedisKeyTTL = async (key: string): Promise<number> => {
  const client = getRedis(); // This will throw if Redis unavailable
  return await client.ttl(key);
};

/**
 * Subscribe to connection state change events
 * Useful for monitoring and reactive behavior
 */
export const onConnectionStateChange = (callback: (state: ConnectionState) => void): void => {
  connectionEvents.on('state-change', callback);
};

/**
 * Unsubscribe from connection state change events
 */
export const offConnectionStateChange = (callback: (state: ConnectionState) => void): void => {
  connectionEvents.off('state-change', callback);
};
