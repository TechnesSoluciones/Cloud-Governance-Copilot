/**
 * Global Test Teardown
 *
 * This file is executed after all test suites.
 * It handles cleanup of test resources.
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

/**
 * Cleanup Prisma connections
 */
export async function cleanupPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting Prisma:', error);
  }
}

/**
 * Cleanup Redis connections
 */
export async function cleanupRedis(redis: Redis): Promise<void> {
  try {
    await redis.quit();
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
  }
}

/**
 * Clear all test data from database
 * Use with caution - only in test environment
 */
export async function clearTestDatabase(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearTestDatabase can only be run in test environment');
  }

  // Clear tables in reverse dependency order
  await prisma.costAnomaly.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.costData.deleteMany({});
  await prisma.cloudAccount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
}

/**
 * Global teardown
 */
afterAll(async () => {
  // Add any global cleanup here
  await new Promise(resolve => setTimeout(resolve, 500));
});
