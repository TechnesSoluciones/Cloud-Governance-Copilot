/**
 * Jest Test Setup
 * Global configuration and utilities for API integration tests
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client for testing
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/copilot_test',
    },
  },
});

// Setup before all tests
beforeAll(async () => {
  console.log('Setting up test environment...');

  // Connect to test database
  await prisma.$connect();

  // Optional: Run migrations
  // await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data
  // Note: Adjust these based on your schema
  // await prisma.auditLog.deleteMany();
  // await prisma.cloudAccount.deleteMany();
  // await prisma.session.deleteMany();
  // await prisma.user.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  console.log('Tearing down test environment...');

  // Disconnect from database
  await prisma.$disconnect();
});

// Global test utilities
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateUniqueEmail = () => {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
};

export const generateStrongPassword = () => {
  return `TestPass${Date.now()}!@#`;
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
