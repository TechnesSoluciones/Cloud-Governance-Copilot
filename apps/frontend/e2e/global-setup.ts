import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Suite - Global Setup');
  console.log('========================================');

  // Extract baseURL from the first project's use config or from config metadata
  const baseURL =
    (config.projects?.[0]?.use?.baseURL as string | undefined) ||
    process.env.BASE_URL ||
    'http://localhost:3010';
  console.log(`Base URL: ${baseURL}`);

  // Launch browser to perform setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    console.log('Waiting for application to be ready...');
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Application is ready!');

    // You can perform additional setup tasks here:
    // - Seed test database
    // - Create test users
    // - Set up test data
    // - Clear caches

    console.log('Global setup completed successfully ✓');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('========================================\n');
}

export default globalSetup;
