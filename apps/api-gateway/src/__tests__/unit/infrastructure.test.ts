/**
 * Test Infrastructure Verification
 *
 * This is a simple test to verify that the testing infrastructure is working correctly.
 */

import { describe, test, expect } from '@jest/globals';

describe('Testing Infrastructure', () => {
  test('should execute tests successfully', () => {
    expect(true).toBe(true);
  });

  test('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should have Jest configured', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();
  });
});
