/**
 * Alert Rule DTOs (Data Transfer Objects)
 *
 * Validation schemas and type definitions for alert rule endpoints.
 * Uses Zod for runtime validation and type inference.
 *
 * @module alert-rules/dto
 */

import { z } from 'zod';

/**
 * Alert severity levels validation
 */
const alertSeveritySchema = z.union([
  z.literal(0), // Critical
  z.literal(1), // Error
  z.literal(2), // Warning
  z.literal(3), // Informational
  z.literal(4), // Verbose
]);

/**
 * Alert rule type validation
 */
const alertRuleTypeSchema = z.enum(['metric', 'log', 'activityLog']);

/**
 * Alert operator validation
 */
const alertOperatorSchema = z.enum([
  'GreaterThan',
  'LessThan',
  'GreaterThanOrEqual',
  'LessThanOrEqual',
  'Equals',
]);

/**
 * Aggregation type validation
 */
const aggregationTypeSchema = z.enum(['Average', 'Maximum', 'Minimum', 'Total', 'Count']);

/**
 * Alert condition validation schema
 */
const alertConditionSchema = z.object({
  type: alertRuleTypeSchema,
  // Metric alert fields
  metricName: z.string().optional(),
  metricNamespace: z.string().optional(),
  operator: alertOperatorSchema.optional(),
  threshold: z.number().optional(),
  aggregation: aggregationTypeSchema.optional(),
  // Log alert fields
  query: z.string().max(50000).optional(),
  // Activity log alert fields
  category: z.string().optional(),
  operationName: z.string().optional(),
  level: z.enum(['Critical', 'Error', 'Warning', 'Informational']).optional(),
});

/**
 * GET /api/v1/alert-rules query parameters
 */
export const getAlertRulesQuerySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
});

export type GetAlertRulesQuery = z.infer<typeof getAlertRulesQuerySchema>;

/**
 * POST /api/v1/alert-rules request body
 */
export const createAlertRuleSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(true),
  severity: alertSeveritySchema,
  targetResourceId: z
    .string()
    .min(1, 'Target resource ID is required')
    .regex(/^\/subscriptions\//, 'Invalid Azure resource ID format'),
  resourceGroupName: z.string().min(1, 'Resource group name is required'),
  condition: alertConditionSchema,
  actionGroupIds: z.array(z.string()).optional(),
  evaluationFrequency: z
    .string()
    .regex(/^PT\d+[MH]$/, 'Invalid ISO 8601 duration format (e.g., PT5M, PT1H)')
    .optional(),
  windowSize: z
    .string()
    .regex(/^PT\d+[MH]$/, 'Invalid ISO 8601 duration format (e.g., PT15M, PT6H)')
    .optional(),
  autoMitigate: z.boolean().optional(),
});

export type CreateAlertRuleBody = z.infer<typeof createAlertRuleSchema>;

/**
 * PUT /api/v1/alert-rules/:id request body
 */
export const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  severity: alertSeveritySchema.optional(),
  condition: alertConditionSchema.optional(),
  actionGroupIds: z.array(z.string()).optional(),
  evaluationFrequency: z
    .string()
    .regex(/^PT\d+[MH]$/, 'Invalid ISO 8601 duration format')
    .optional(),
  windowSize: z
    .string()
    .regex(/^PT\d+[MH]$/, 'Invalid ISO 8601 duration format')
    .optional(),
  autoMitigate: z.boolean().optional(),
});

export type UpdateAlertRuleBody = z.infer<typeof updateAlertRuleSchema>;

/**
 * Alert rule response
 */
export interface AlertRuleResponse {
  id: string;
  name: string;
  type: 'metric' | 'log' | 'activityLog';
  description?: string;
  enabled: boolean;
  severity: 0 | 1 | 2 | 3 | 4;
  targetResourceId: string;
  condition: string;
  actionGroups: string[];
  evaluationFrequency?: string;
  windowSize?: string;
  autoMitigate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Alert rule template response
 */
export interface AlertRuleTemplateResponse {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'cost' | 'security' | 'availability';
  config: {
    name?: string;
    enabled?: boolean;
    severity?: 0 | 1 | 2 | 3 | 4;
    condition?: any;
    evaluationFrequency?: string;
    windowSize?: string;
    autoMitigate?: boolean;
  };
}
