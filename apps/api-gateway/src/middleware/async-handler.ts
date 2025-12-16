/**
 * Async Handler Middleware
 *
 * Wraps async route handlers to catch errors and pass them to Express error handler.
 * Eliminates the need for try-catch blocks in every route handler.
 *
 * @module middleware/async-handler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to catch errors
 *
 * @param fn - Async route handler function
 * @returns Express RequestHandler
 *
 * @example
 * ```typescript
 * router.get('/resource/:id', asyncHandler(async (req, res, next) => {
 *   const resource = await getResource(req.params.id);
 *   res.json(resource);
 * }));
 * ```
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
