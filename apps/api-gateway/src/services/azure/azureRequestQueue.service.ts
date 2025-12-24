/**
 * Azure Request Queue Service
 * Queues and throttles Azure API requests to prevent rate limiting
 * Implements request queuing with priority support
 */

import { logger } from '../../utils/logger';

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
  accountId: string;
  service: string;
}

/**
 * Azure Request Queue Service
 *
 * Features:
 * - Request queuing to prevent burst traffic
 * - Priority-based processing (higher priority = processed first)
 * - Per-account queues to isolate noisy neighbors
 * - Configurable concurrency limits
 * - Automatic queue cleanup
 */
export class AzureRequestQueueService {
  private static queues: Map<string, QueuedRequest<any>[]> = new Map();
  private static processing: Map<string, boolean> = new Map();
  private static readonly MAX_QUEUE_SIZE = 100;
  private static readonly PROCESSING_DELAY_MS = 200; // Delay between requests (5 req/sec)

  /**
   * Generate queue key for service+account isolation
   */
  private static getQueueKey(service: string, accountId: string): string {
    return `${service}:${accountId}`;
  }

  /**
   * Enqueue a request for execution
   * @param service - Azure service name (resourceGraph, costManagement, etc.)
   * @param accountId - Cloud account ID
   * @param execute - Function to execute
   * @param priority - Request priority (0-10, higher = more important)
   * @returns Promise that resolves with the request result
   */
  static async enqueue<T>(
    service: string,
    accountId: string,
    execute: () => Promise<T>,
    priority: number = 5
  ): Promise<T> {
    const queueKey = this.getQueueKey(service, accountId);

    // Check queue size limit
    const queue = this.queues.get(queueKey) || [];
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('Request queue full, rejecting request', {
        service,
        accountId,
        queueSize: queue.length,
      });
      throw new Error('Request queue is full. Please try again later.');
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        execute,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        accountId,
        service,
      };

      // Add to queue
      if (!this.queues.has(queueKey)) {
        this.queues.set(queueKey, []);
      }
      this.queues.get(queueKey)!.push(request);

      // Sort by priority (descending) and timestamp (ascending)
      this.queues.get(queueKey)!.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older requests first
      });

      logger.debug('Request enqueued', {
        service,
        accountId,
        requestId: request.id,
        priority,
        queueSize: this.queues.get(queueKey)!.length,
      });

      // Start processing if not already processing
      this.processQueue(queueKey);
    });
  }

  /**
   * Process requests in the queue
   */
  private static async processQueue(queueKey: string): Promise<void> {
    // Check if already processing this queue
    if (this.processing.get(queueKey)) {
      return;
    }

    this.processing.set(queueKey, true);

    try {
      while (true) {
        const queue = this.queues.get(queueKey);
        if (!queue || queue.length === 0) {
          break;
        }

        const request = queue.shift()!;

        try {
          logger.debug('Processing queued request', {
            service: request.service,
            accountId: request.accountId,
            requestId: request.id,
            queueSize: queue.length,
            waitTimeMs: Date.now() - request.timestamp,
          });

          const result = await request.execute();
          request.resolve(result);

          logger.debug('Queued request completed', {
            service: request.service,
            accountId: request.accountId,
            requestId: request.id,
          });
        } catch (error: any) {
          logger.error('Queued request failed', {
            service: request.service,
            accountId: request.accountId,
            requestId: request.id,
            error: error.message,
          });
          request.reject(error);
        }

        // Wait before processing next request to prevent burst
        if (queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.PROCESSING_DELAY_MS));
        }
      }
    } finally {
      this.processing.set(queueKey, false);

      // Cleanup empty queue
      const queue = this.queues.get(queueKey);
      if (!queue || queue.length === 0) {
        this.queues.delete(queueKey);
        this.processing.delete(queueKey);
      }
    }
  }

  /**
   * Get queue status for monitoring
   */
  static getQueueStatus(service: string, accountId: string): {
    queueSize: number;
    isProcessing: boolean;
    oldestRequestAge?: number;
  } {
    const queueKey = this.getQueueKey(service, accountId);
    const queue = this.queues.get(queueKey) || [];
    const isProcessing = this.processing.get(queueKey) || false;

    let oldestRequestAge: number | undefined;
    if (queue.length > 0) {
      const oldestRequest = queue[queue.length - 1]; // Last item (lowest priority/oldest)
      oldestRequestAge = Date.now() - oldestRequest.timestamp;
    }

    return {
      queueSize: queue.length,
      isProcessing,
      oldestRequestAge,
    };
  }

  /**
   * Clear all queues (for testing or emergency situations)
   */
  static clearAllQueues(): void {
    const queueCount = this.queues.size;

    // Reject all pending requests
    for (const [queueKey, queue] of this.queues.entries()) {
      for (const request of queue) {
        request.reject(new Error('Queue cleared'));
      }
    }

    this.queues.clear();
    this.processing.clear();

    logger.warn('All request queues cleared', { queueCount });
  }

  /**
   * Clear queue for specific service and account
   */
  static clearQueue(service: string, accountId: string): void {
    const queueKey = this.getQueueKey(service, accountId);
    const queue = this.queues.get(queueKey);

    if (queue) {
      // Reject all pending requests
      for (const request of queue) {
        request.reject(new Error('Queue cleared'));
      }

      this.queues.delete(queueKey);
      this.processing.delete(queueKey);

      logger.info('Request queue cleared', { service, accountId, requestCount: queue.length });
    }
  }
}
