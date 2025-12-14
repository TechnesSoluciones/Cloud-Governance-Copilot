/**
 * Prisma Client Mock
 *
 * This mock provides a reusable Prisma client for testing.
 * Use this mock to avoid actual database calls in unit tests.
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

/**
 * Deep mock of PrismaClient
 */
export const prismaMock = mockDeep<PrismaClient>();

/**
 * Reset all mocks before each test
 */
beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * Type-safe Prisma mock
 */
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

/**
 * Create a fresh Prisma mock instance
 */
export function createPrismaMock(): MockPrismaClient {
  return mockDeep<PrismaClient>();
}

export default prismaMock;
