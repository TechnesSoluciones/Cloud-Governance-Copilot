/**
 * Incidents Validation Schemas
 *
 * This file contains Zod validation schemas for all incident-related endpoints.
 * It provides comprehensive validation for query parameters, request bodies, and path parameters.
 *
 * Validation Coverage:
 * - Get alerts (query params with filtering, pagination)
 * - Get activity logs (query params with time range, filtering)
 * - Get incidents (query params with filtering, pagination)
 * - Get incident by ID (path params)
 * - Update incident status (path params + body)
 * - Add comment (path params + body)
 * - Get resource metrics (path params + query params)
 *
 * @module modules/incidents/validators
 */

import { z } from 'zod';

// ============================================================
// Enum Schemas
// ============================================================

/**
 * Valid alert severity levels
 */
export const AlertSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

/**
 * Valid alert status values
 */
export const AlertStatusSchema = z.enum(['active', 'resolved', 'suppressed']);

/**
 * Valid incident status values
 */
export const IncidentStatusSchema = z.enum([
  'new',
  'acknowledged',
  'investigating',
  'resolved',
  'closed',
]);

/**
 * Valid activity log levels
 */
export const ActivityLogLevelSchema = z.enum([
  'Critical',
  'Error',
  'Warning',
  'Informational',
  'Verbose',
]);

/**
 * Valid activity log status values
 */
export const ActivityLogStatusSchema = z.enum(['Succeeded', 'Failed', 'InProgress', 'Canceled']);

/**
 * Valid metric aggregation types
 */
export const MetricAggregationSchema = z.enum(['Average', 'Minimum', 'Maximum', 'Total', 'Count']);

// ============================================================
// Reusable Schemas
// ============================================================

/**
 * UUID validation schema
 */
export const UuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * ISO Date string validation schema
 */
export const IsoDateSchema = z.string().datetime('Must be a valid ISO date string');

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(
      z.number().int().min(1, 'Page size must be at least 1').max(100, 'Page size cannot exceed 100')
    ),
});

// ============================================================
// Request Validation Schemas
// ============================================================

/**
 * Schema for GET /api/v1/incidents/alerts
 *
 * Query Parameters:
 * - accountId (required): Azure account ID (UUID)
 * - severity (optional): Comma-separated alert severity levels
 * - status (optional): Comma-separated alert statuses
 * - resourceType (optional): Resource type filter
 * - startDate (optional): ISO date string for time range start
 * - endDate (optional): ISO date string for time range end
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Results per page (default: 50, max: 100)
 */
export const GetAlertsSchema = z
  .object({
    accountId: UuidSchema,
    severity: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(AlertSeveritySchema).optional()),
    status: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(AlertStatusSchema).optional()),
    resourceType: z.string().optional(),
    startDate: IsoDateSchema.optional(),
    endDate: IsoDateSchema.optional(),
  })
  .merge(
    PaginationSchema.extend({
      pageSize: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 50))
        .pipe(
          z
            .number()
            .int()
            .min(1, 'Page size must be at least 1')
            .max(100, 'Page size cannot exceed 100')
        ),
    })
  )
  .refine(
    (data) => {
      // If one date is provided, both must be provided
      if (data.startDate || data.endDate) {
        return data.startDate && data.endDate;
      }
      return true;
    },
    {
      message: 'Both startDate and endDate must be provided when using time range filters',
    }
  );

/**
 * Schema for GET /api/v1/incidents/activity-logs
 *
 * Query Parameters:
 * - accountId (required): Azure account ID (UUID)
 * - startDate (required): ISO date string for time range start
 * - endDate (required): ISO date string for time range end
 * - status (optional): Comma-separated operation statuses
 * - level (optional): Comma-separated log levels
 * - operationName (optional): Specific operation name filter
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Results per page (default: 100, max: 100)
 */
export const GetActivityLogsSchema = z
  .object({
    accountId: UuidSchema,
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    status: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(ActivityLogStatusSchema).optional()),
    level: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(ActivityLogLevelSchema).optional()),
    operationName: z.string().max(500, 'Operation name too long').optional(),
  })
  .merge(
    PaginationSchema.extend({
      pageSize: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 100))
        .pipe(
          z
            .number()
            .int()
            .min(1, 'Page size must be at least 1')
            .max(100, 'Page size cannot exceed 100')
        ),
    })
  );

/**
 * Schema for GET /api/v1/incidents
 *
 * Query Parameters:
 * - accountId (required): Azure account ID (UUID or string)
 * - status (optional): Comma-separated incident statuses
 * - severity (optional): Comma-separated severity levels
 * - assignedTo (optional): User ID
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Results per page (default: 20, max: 100)
 */
export const GetIncidentsSchema = z
  .object({
    accountId: z.string().min(1, 'Account ID is required'),
    status: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(IncidentStatusSchema).optional()),
    severity: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',') : undefined))
      .pipe(z.array(AlertSeveritySchema).optional()),
    assignedTo: z.string().optional(),
  })
  .merge(PaginationSchema);

/**
 * Schema for GET /api/v1/incidents/:id
 *
 * Path Parameters:
 * - id: UUID of the incident
 */
export const GetIncidentByIdSchema = z.object({
  id: UuidSchema,
});

/**
 * Schema for PATCH /api/v1/incidents/:id/status
 *
 * Path Parameters:
 * - id: UUID of the incident
 *
 * Body Parameters:
 * - status (required): New incident status
 * - notes (optional): Notes about the status change (max 2000 chars)
 * - assignedTo (optional): User ID to assign the incident to
 */
export const UpdateIncidentStatusSchema = z.object({
  params: z.object({
    id: UuidSchema,
  }),
  body: z.object({
    status: IncidentStatusSchema,
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
    assignedTo: z.string().optional(),
  }),
});

/**
 * Schema for POST /api/v1/incidents/:id/comments
 *
 * Path Parameters:
 * - id: UUID of the incident
 *
 * Body Parameters:
 * - comment (required): Comment text (min 1 char, max 5000 chars)
 */
export const AddCommentSchema = z.object({
  params: z.object({
    id: UuidSchema,
  }),
  body: z.object({
    comment: z
      .string()
      .min(1, 'Comment cannot be empty')
      .max(5000, 'Comment cannot exceed 5000 characters')
      .trim(),
  }),
});

/**
 * Schema for GET /api/v1/incidents/metrics/:resourceId
 *
 * Path Parameters:
 * - resourceId: Azure resource ID (URL encoded)
 *
 * Query Parameters:
 * - accountId (required): Azure account ID (UUID)
 * - metricNames (required): Comma-separated list of metric names
 * - startDate (required): ISO date string for time range start
 * - endDate (required): ISO date string for time range end
 * - aggregation (optional): Metric aggregation type (default: Average)
 * - interval (optional): ISO 8601 duration string (default: PT5M)
 */
export const GetResourceMetricsSchema = z.object({
  params: z.object({
    resourceId: z.string().min(1, 'Resource ID is required'),
  }),
  query: z.object({
    accountId: UuidSchema,
    metricNames: z
      .string()
      .min(1, 'At least one metric name is required')
      .transform((val) => val.split(',').map((m) => m.trim()))
      .pipe(z.array(z.string().min(1)).min(1, 'At least one metric name is required')),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    aggregation: MetricAggregationSchema.optional().default('Average'),
    interval: z
      .string()
      .regex(/^PT\d+[HMS]$/, 'Interval must be a valid ISO 8601 duration (e.g., PT5M, PT1H)')
      .optional()
      .default('PT5M'),
  }),
});

/**
 * Schema for creating a new incident
 *
 * Body Parameters:
 * - tenantId (required): Tenant ID (UUID)
 * - accountId (required): Account ID
 * - title (required): Incident title (min 3 chars, max 500 chars)
 * - description (optional): Incident description (max 5000 chars)
 * - severity (required): Incident severity level
 * - affectedResources (optional): Array of affected resource IDs
 * - alertIds (optional): Array of related alert IDs
 * - assignedTo (optional): User ID to assign the incident to
 */
export const CreateIncidentSchema = z.object({
  tenantId: UuidSchema,
  accountId: z.string().min(1, 'Account ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  severity: AlertSeveritySchema,
  affectedResources: z.array(z.string()).optional(),
  alertIds: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
});

// ============================================================
// Type Exports (Inferred from Schemas)
// ============================================================

export type GetAlertsInput = z.infer<typeof GetAlertsSchema>;
export type GetActivityLogsInput = z.infer<typeof GetActivityLogsSchema>;
export type GetIncidentsInput = z.infer<typeof GetIncidentsSchema>;
export type GetIncidentByIdInput = z.infer<typeof GetIncidentByIdSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof UpdateIncidentStatusSchema>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
export type GetResourceMetricsInput = z.infer<typeof GetResourceMetricsSchema>;
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
