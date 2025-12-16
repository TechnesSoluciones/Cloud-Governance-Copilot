/**
 * Request Validation Middleware
 *
 * Validates incoming requests using Zod schemas.
 * Automatically validates params, query, and body based on schema definition.
 *
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validates request against a Zod schema
 *
 * @param schema - Zod schema with optional params, query, and body fields
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   params: z.object({
 *     id: z.string().uuid(),
 *   }),
 *   query: z.object({
 *     limit: z.coerce.number().min(1).max(100),
 *   }),
 *   body: z.object({
 *     name: z.string().min(1),
 *   }),
 * });
 *
 * router.post('/resource/:id', validateRequest(schema), handler);
 * ```
 */
export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request against the schema
      const validated = await schema.parseAsync({
        params: req.params,
        query: req.query,
        body: req.body,
      });

      // Replace request data with validated data
      req.params = validated.params || req.params;
      req.query = validated.query || req.query;
      req.body = validated.body || req.body;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
          },
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  };
};

/**
 * Validates request body only
 *
 * @param schema - Zod schema for request body
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const bodySchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * router.post('/user', validateBody(bodySchema), handler);
 * ```
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            details: errors,
          },
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Validates query parameters only
 *
 * @param schema - Zod schema for query parameters
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const querySchema = z.object({
 *   page: z.coerce.number().min(1).default(1),
 *   limit: z.coerce.number().min(1).max(100).default(20),
 * });
 *
 * router.get('/resources', validateQuery(querySchema), handler);
 * ```
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter validation failed',
            details: errors,
          },
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Validates route parameters only
 *
 * @param schema - Zod schema for route parameters
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const paramsSchema = z.object({
 *   id: z.string().uuid(),
 *   resourceType: z.enum(['vm', 'disk', 'network']),
 * });
 *
 * router.get('/resource/:resourceType/:id', validateParams(paramsSchema), handler);
 * ```
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route parameter validation failed',
            details: errors,
          },
        });
        return;
      }

      next(error);
    }
  };
};
