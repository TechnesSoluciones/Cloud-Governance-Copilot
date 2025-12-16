/**
 * Log Analytics DTOs (Data Transfer Objects)
 *
 * Validation schemas and type definitions for log analytics endpoints.
 * Uses Zod for runtime validation and type inference.
 *
 * @module log-analytics/dto
 */

import { z } from 'zod';

/**
 * Timespan type validation
 */
const timespanTypeSchema = z.enum(['24h', '7d', '30d', 'custom']);

/**
 * Timespan validation schema
 */
const timespanSchema = z.object({
  type: timespanTypeSchema,
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).refine(
  (data) => {
    // If type is custom, start and end are required
    if (data.type === 'custom') {
      return data.start !== undefined && data.end !== undefined;
    }
    return true;
  },
  {
    message: 'Custom timespan requires both start and end dates',
  }
);

/**
 * Pre-built query names
 */
const preBuiltQueryNameSchema = z.enum([
  'failed_operations',
  'high_cpu_alerts',
  'network_errors',
  'security_events',
  'resource_changes',
]);

/**
 * POST /api/v1/log-analytics/query request body
 */
export const executeQuerySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  query: z.string().min(1, 'Query is required').max(50000, 'Query too long'),
  timespan: timespanSchema,
  timeout: z.number().min(1).max(60).optional(), // seconds
  maxRows: z.number().min(1).max(10000).optional(),
});

export type ExecuteQueryBody = z.infer<typeof executeQuerySchema>;

/**
 * GET /api/v1/log-analytics/prebuilt/:queryName query parameters
 */
export const getPreBuiltQuerySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  params: z.record(z.any()).optional(),
});

export type GetPreBuiltQueryParams = z.infer<typeof getPreBuiltQuerySchema>;

/**
 * GET /api/v1/log-analytics/history query parameters
 */
export const getQueryHistorySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
});

export type GetQueryHistoryParams = z.infer<typeof getQueryHistorySchema>;

/**
 * POST /api/v1/log-analytics/save request body
 */
export const saveQuerySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  query: z.string().min(1, 'Query is required').max(50000, 'Query too long'),
  description: z.string().max(1000).optional(),
});

export type SaveQueryBody = z.infer<typeof saveQuerySchema>;

/**
 * DELETE /api/v1/log-analytics/queries/:id query parameters
 */
export const deleteQuerySchema = z.object({
  id: z.string().uuid('Invalid query ID'),
});

export type DeleteQueryParams = z.infer<typeof deleteQuerySchema>;

/**
 * Query result response
 */
export interface QueryResultResponse {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

/**
 * Saved query response
 */
export interface SavedQueryResponse {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  query: string;
  description?: string;
  createdBy?: string;
  lastExecuted?: string;
  executionCount: number;
  createdAt: string;
}

/**
 * Pre-built query info response
 */
export interface PreBuiltQueryInfo {
  name: string;
  description: string;
  defaultTimespan: '24h' | '7d' | '30d';
  category: 'operations' | 'performance' | 'security' | 'network';
}
