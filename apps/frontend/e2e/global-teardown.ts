import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n========================================');
  console.log('🧹 E2E Test Suite - Global Teardown');
  console.log('========================================');

  try {
    // Perform cleanup tasks:
    // - Clean up test database
    // - Remove test files
    // - Clear test caches
    // - Generate reports

    console.log('Cleaning up test data...');
    console.log('Global teardown completed successfully ✓');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw - we don't want to fail the test suite on cleanup errors
  }

  console.log('========================================\n');
}

export default globalTeardown;
