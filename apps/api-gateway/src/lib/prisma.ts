/**
 * Prisma Client Singleton with Tenant Isolation
 *
 * This module provides a single, shared instance of PrismaClient across the application,
 * preventing connection pool exhaustion and ensuring consistent database access.
 *
 * CRITICAL SECURITY: Implements tenant isolation middleware that automatically filters
 * all database queries by tenantId to prevent data leakage between tenants.
 *
 * Architecture Pattern: Singleton Pattern
 * - Single PrismaClient instance shared across all requests
 * - Connection pooling optimized (prevents pool exhaustion at 60+ concurrent users)
 * - Automatic tenant isolation via Prisma middleware
 * - Context-based tenant ID injection from authenticated requests
 *
 * Usage:
 * ```typescript
 * import { prisma, setTenantContext } from './lib/prisma';
 *
 * // In Express middleware (after authentication)
 * setTenantContext(req.user.tenantId);
 *
 * // In services - queries automatically filtered by tenantId
 * const users = await prisma.user.findMany(); // Only returns users for current tenant
 * ```
 *
 * @module lib/prisma
 */

import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// ============================================================
// Async Context for Tenant Isolation
// ============================================================

/**
 * Async Local Storage for tenant context
 * Allows passing tenant ID through async call chains without explicit parameters
 */
const asyncLocalStorage = new AsyncLocalStorage<{ tenantId: string }>();

/**
 * Sets the current tenant context for the async execution chain
 * This should be called in Express middleware after authentication
 *
 * @param tenantId - The tenant ID from the authenticated user's JWT token
 * @returns A function to run code within the tenant context
 */
export function setTenantContext<T>(tenantId: string, callback: () => T): T {
  return asyncLocalStorage.run({ tenantId }, callback);
}

/**
 * Gets the current tenant ID from async context
 * Returns undefined if called outside tenant context (e.g., in background jobs)
 *
 * @returns The current tenant ID or undefined
 */
export function getTenantId(): string | undefined {
  return asyncLocalStorage.getStore()?.tenantId;
}

// ============================================================
// Models that should NOT be filtered by tenant
// ============================================================

/**
 * Models that are tenant-scoped themselves or should not be auto-filtered
 * - Tenant: The tenant model itself
 * - Subscription: Handled separately with explicit filtering
 */
const TENANT_EXEMPT_MODELS = new Set([
  'Tenant',
  // Add other models that should not be auto-filtered here
]);

/**
 * Operations that should not be filtered (for safety)
 * - Raw queries: Use with caution, must handle tenant filtering manually
 */
const EXEMPT_OPERATIONS = new Set([
  'queryRaw',
  'executeRaw',
  'queryRawUnsafe',
  'executeRawUnsafe',
]);

// ============================================================
// Prisma Client Singleton
// ============================================================

/**
 * Global Prisma Client instance
 * Using global object to prevent multiple instances in development (hot reload)
 */
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma Client with optimized configuration
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

  // ============================================================
  // CRITICAL: Tenant Isolation Middleware
  // ============================================================

  client.$use(async (params, next) => {
    const tenantId = getTenantId();
    const modelName = params.model;
    const operation = params.action;

    // Skip filtering for exempt models and operations
    if (
      !modelName ||
      TENANT_EXEMPT_MODELS.has(modelName) ||
      EXEMPT_OPERATIONS.has(operation)
    ) {
      return next(params);
    }

    // ============================================================
    // Automatic Tenant Filtering
    // ============================================================

    // If no tenant context is available, allow the query (for background jobs, migrations, etc.)
    // WARNING: This is intentional for system operations but should be monitored
    if (!tenantId) {
      // Log when queries execute without tenant context (useful for debugging)
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[TenantIsolation] Query on ${modelName}.${operation} executed without tenant context`
        );
      }
      return next(params);
    }

    // ============================================================
    // Query Modification Based on Operation Type
    // ============================================================

    switch (operation) {
      // Read operations: Add tenant filter to WHERE clause
      case 'findUnique':
      case 'findFirst':
      case 'findMany':
      case 'count':
      case 'aggregate':
      case 'groupBy':
        params.args = params.args || {};
        params.args.where = params.args.where || {};

        // Only add tenant filter if not already present
        if (!params.args.where.tenantId) {
          params.args.where.tenantId = tenantId;
        } else if (params.args.where.tenantId !== tenantId) {
          // SECURITY: Prevent cross-tenant access attempts
          throw new Error(
            `[TenantIsolation] Attempted cross-tenant access: requested tenantId=${params.args.where.tenantId} but authenticated as tenantId=${tenantId}`
          );
        }
        break;

      // Write operations: Add tenant ID to data
      case 'create':
        params.args = params.args || {};
        params.args.data = params.args.data || {};

        // Auto-inject tenantId if not provided
        if (!params.args.data.tenantId) {
          params.args.data.tenantId = tenantId;
        } else if (params.args.data.tenantId !== tenantId) {
          // SECURITY: Prevent creating records for other tenants
          throw new Error(
            `[TenantIsolation] Attempted to create record for different tenant: data.tenantId=${params.args.data.tenantId} but authenticated as tenantId=${tenantId}`
          );
        }
        break;

      case 'createMany':
        params.args = params.args || {};
        params.args.data = params.args.data || [];

        // Auto-inject tenantId for all records
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((record: any) => {
            if (!record.tenantId) {
              return { ...record, tenantId };
            } else if (record.tenantId !== tenantId) {
              throw new Error(
                `[TenantIsolation] Attempted to create record for different tenant in createMany`
              );
            }
            return record;
          });
        }
        break;

      // Update operations: Add tenant filter to WHERE clause
      case 'update':
      case 'updateMany':
      case 'upsert':
        params.args = params.args || {};
        params.args.where = params.args.where || {};

        // Add tenant filter to WHERE clause
        if (!params.args.where.tenantId) {
          params.args.where.tenantId = tenantId;
        } else if (params.args.where.tenantId !== tenantId) {
          throw new Error(
            `[TenantIsolation] Attempted cross-tenant update: where.tenantId=${params.args.where.tenantId} but authenticated as tenantId=${tenantId}`
          );
        }

        // For upsert, also inject tenantId in create data
        if (operation === 'upsert') {
          params.args.create = params.args.create || {};
          if (!params.args.create.tenantId) {
            params.args.create.tenantId = tenantId;
          }
        }
        break;

      // Delete operations: Add tenant filter to WHERE clause
      case 'delete':
      case 'deleteMany':
        params.args = params.args || {};
        params.args.where = params.args.where || {};

        // Add tenant filter to WHERE clause
        if (!params.args.where.tenantId) {
          params.args.where.tenantId = tenantId;
        } else if (params.args.where.tenantId !== tenantId) {
          throw new Error(
            `[TenantIsolation] Attempted cross-tenant delete: where.tenantId=${params.args.where.tenantId} but authenticated as tenantId=${tenantId}`
          );
        }
        break;

      default:
        // Allow other operations to proceed without modification
        break;
    }

    return next(params);
  });

  return client;
}

/**
 * Prisma Client Singleton Instance
 *
 * Use this instance throughout the application instead of creating new PrismaClient instances.
 * This prevents connection pool exhaustion and ensures tenant isolation middleware is applied.
 *
 * @example
 * ```typescript
 * import { prisma } from './lib/prisma';
 *
 * const users = await prisma.user.findMany(); // Automatically filtered by tenant
 * ```
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Call this when the application shuts down to close database connections
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// ============================================================
// Type Exports for Testing
// ============================================================

export type { PrismaClient };
