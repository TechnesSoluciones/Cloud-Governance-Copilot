/**
 * FinOps Recommendations Validation Schemas
 *
 * This file contains Zod validation schemas for all recommendation-related endpoints.
 * It provides comprehensive validation for query parameters, request bodies, and path parameters.
 *
 * Validation Coverage:
 * - Generate recommendations (query params)
 * - List recommendations (query params with pagination, filtering, sorting)
 * - Get single recommendation (path params)
 * - Apply recommendation (path params + body)
 * - Dismiss recommendation (path params + body)
 * - Get recommendations summary (query params)
 *
 * @module FinOps/Validators
 */

import { z } from 'zod';

// ============================================================
// Enum Schemas
// ============================================================

/**
 * Valid recommendation status values
 */
export const RecommendationStatusSchema = z.enum(['open', 'applied', 'dismissed']);

/**
 * Valid recommendation types
 */
export const RecommendationTypeSchema = z.enum([
  'idle_resource',
  'rightsize',
  'unused_resource',
  'delete_snapshot',
  'reserved_instance',
]);

/**
 * Valid priority levels
 */
export const PrioritySchema = z.enum(['high', 'medium', 'low']);

/**
 * Valid cloud providers
 */
export const ProviderSchema = z.enum(['AWS', 'AZURE']);

/**
 * Valid sort order
 */
export const SortOrderSchema = z.enum(['asc', 'desc']);

/**
 * Valid sort fields for recommendations
 */
export const SortBySchema = z.enum(['createdAt', 'estimatedSavings', 'priority', 'provider']);

// ============================================================
// Request Validation Schemas
// ============================================================

/**
 * Schema for POST /api/v1/finops/recommendations/generate
 *
 * Body Parameters:
 * - cloudAccountId (optional): UUID of specific cloud account to analyze
 */
export const GenerateRecommendationsSchema = z.object({
  cloudAccountId: z.string().uuid('Cloud account ID must be a valid UUID').optional(),
});

/**
 * Schema for GET /api/v1/finops/recommendations
 *
 * Query Parameters:
 * - status (optional): Filter by recommendation status
 * - type (optional): Filter by recommendation type
 * - provider (optional): Filter by cloud provider
 * - priority (optional): Filter by priority level
 * - page (optional): Page number for pagination (min: 1, default: 1)
 * - limit (optional): Results per page (min: 1, max: 100, default: 20)
 * - sortBy (optional): Field to sort by (default: createdAt)
 * - sortOrder (optional): Sort direction (default: desc)
 */
export const ListRecommendationsSchema = z.object({
  status: RecommendationStatusSchema.optional(),
  type: RecommendationTypeSchema.optional(),
  provider: ProviderSchema.optional(),
  priority: PrioritySchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
  sortBy: SortBySchema.optional().default('createdAt'),
  sortOrder: SortOrderSchema.optional().default('desc'),
});

/**
 * Schema for GET /api/v1/finops/recommendations/:id
 *
 * Path Parameters:
 * - id: UUID of the recommendation
 */
export const GetRecommendationSchema = z.object({
  id: z.string().uuid('Recommendation ID must be a valid UUID'),
});

/**
 * Schema for POST /api/v1/finops/recommendations/:id/apply
 *
 * Path Parameters:
 * - id: UUID of the recommendation
 *
 * Body Parameters:
 * - notes (optional): Additional notes about the application
 */
export const ApplyRecommendationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Recommendation ID must be a valid UUID'),
  }),
  body: z.object({
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),
});

/**
 * Schema for POST /api/v1/finops/recommendations/:id/dismiss
 *
 * Path Parameters:
 * - id: UUID of the recommendation
 *
 * Body Parameters:
 * - reason: Reason for dismissing the recommendation (required, min 10 chars)
 */
export const DismissRecommendationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Recommendation ID must be a valid UUID'),
  }),
  body: z.object({
    reason: z.string().min(10, 'Dismiss reason must be at least 10 characters'),
  }),
});

/**
 * Schema for GET /api/v1/finops/recommendations/summary
 *
 * Query Parameters:
 * - status (optional): Filter by recommendation status
 * - provider (optional): Filter by cloud provider
 */
export const GetRecommendationsSummarySchema = z.object({
  status: RecommendationStatusSchema.optional(),
  provider: ProviderSchema.optional(),
});

// ============================================================
// Type Exports (Inferred from Schemas)
// ============================================================

export type GenerateRecommendationsInput = z.infer<typeof GenerateRecommendationsSchema>;
export type ListRecommendationsInput = z.infer<typeof ListRecommendationsSchema>;
export type GetRecommendationInput = z.infer<typeof GetRecommendationSchema>;
export type ApplyRecommendationInput = z.infer<typeof ApplyRecommendationSchema>;
export type DismissRecommendationInput = z.infer<typeof DismissRecommendationSchema>;
export type GetRecommendationsSummaryInput = z.infer<typeof GetRecommendationsSummarySchema>;
