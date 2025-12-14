/**
 * Global Test Setup
 *
 * This file is executed before all test suites.
 * It configures the test environment and sets up global mocks.
 */

import { PrismaClient } from '@prisma/client';

// Setup global test environment
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Set test database URL if not already set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/copilot_test';
  }

  // Set test Redis URL if not already set
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379/1';
  }

  // Disable actual AWS API calls in tests
  process.env.AWS_SDK_MOCK = 'true';

  // Set encryption key for tests (must be 32 bytes base64 encoded)
  if (!process.env.ENCRYPTION_KEY) {
    // Generate a valid 32-byte encryption key for testing
    const crypto = require('crypto');
    const testKey = crypto.randomBytes(32);
    process.env.ENCRYPTION_KEY = testKey.toString('base64');
  }

  // Set JWT secret for tests
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key';
  }

  // Increase timeout for integration tests
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Cleanup resources
  // This will be extended in specific test suites
});

// Mock console methods to reduce noise in tests
// Store original methods for debugging if needed
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Only mock if not in verbose mode
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for important messages
    error: console.error,
  };
}

// Export original console for tests that need it
export { originalConsole };
