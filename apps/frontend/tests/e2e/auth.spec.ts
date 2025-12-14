import { test, expect } from '@playwright/test';
import { generateTestEmail, generateTestName, waitForToast, login, logout } from './helpers';

/**
 * E2E Tests: Authentication Flows
 * Cloud Governance Copilot - Critical Flow #1
 *
 * Tests:
 * 1. User Registration
 * 2. User Login
 * 3. Invalid Credentials Handling
 * 4. User Logout
 */

test.describe('Authentication Flows', () => {
  test.describe.configure({ mode: 'serial' });

  let testUserEmail: string;
  let testUserPassword: string;

  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');

    // Generate unique test user credentials
    testUserEmail = generateTestEmail();
    testUserPassword = 'Test123!@#';
    const testUserName = generateTestName();

    // Fill registration form
    await page.fill('input[name="name"]', testUserName);
    await page.fill('input[name="email"]', testUserEmail);
    await page.fill('input[name="password"]', testUserPassword);
    await page.fill('input[name="confirmPassword"]', testUserPassword);

    // Accept terms if checkbox exists
    const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.check();
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or verify email page
    await page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 15000 });

    // Check for success message or welcome screen
    const successIndicators = [
      page.locator('text=/welcome/i'),
      page.locator('text=/successfully/i'),
      page.locator('text=/verify.*email/i'),
      page.locator('[data-testid="dashboard"]'),
    ];

    let found = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');

    // Use demo credentials
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'Demo123!@#');

    // Submit login form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Verify user is logged in
    const loggedInIndicators = [
      page.locator('[data-testid="user-menu"]'),
      page.locator('[data-testid="user-avatar"]'),
      page.locator('button:has-text("Logout")'),
      page.locator('text=/welcome/i'),
    ];

    let userMenuFound = false;
    for (const indicator of loggedInIndicators) {
      if (await indicator.count() > 0) {
        userMenuFound = true;
        break;
      }
    }

    expect(userMenuFound).toBeTruthy();

    // Verify we're on dashboard by checking for dashboard elements
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Try to login with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    await page.click('button[type="submit"]');

    // Should show error message (not redirect)
    await page.waitForTimeout(2000); // Wait for error to appear

    // Check for error indicators
    const errorIndicators = [
      page.locator('text=/invalid.*credentials/i'),
      page.locator('text=/incorrect.*password/i'),
      page.locator('text=/authentication.*failed/i'),
      page.locator('text=/user.*not.*found/i'),
      page.locator('[role="alert"]'),
      page.locator('.error'),
      page.locator('[data-testid="error-message"]'),
    ];

    let errorFound = false;
    for (const indicator of errorIndicators) {
      const count = await indicator.count();
      if (count > 0 && await indicator.first().isVisible()) {
        errorFound = true;
        break;
      }
    }

    expect(errorFound).toBeTruthy();

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first using helper
    await login(page);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/dashboard/);

    // Find and click logout button/link
    // Try multiple common patterns for logout
    const logoutPatterns = [
      async () => {
        // Pattern 1: User menu dropdown
        await page.click('[data-testid="user-menu"]');
        await page.click('text=/logout/i');
      },
      async () => {
        // Pattern 2: User avatar dropdown
        await page.click('[data-testid="user-avatar"]');
        await page.click('text=/logout/i');
      },
      async () => {
        // Pattern 3: Direct logout button
        await page.click('button:has-text("Logout")');
      },
      async () => {
        // Pattern 4: Settings menu
        await page.click('a[href="/settings"]');
        await page.click('text=/logout/i');
      },
    ];

    let loggedOut = false;
    for (const pattern of logoutPatterns) {
      try {
        await pattern();
        // Wait for redirect to login
        await page.waitForURL(/\/login/, { timeout: 5000 });
        loggedOut = true;
        break;
      } catch (error) {
        // Try next pattern
        continue;
      }
    }

    expect(loggedOut).toBeTruthy();

    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/);

    // Verify login form is visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should prevent access to protected routes when not logged in', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });

    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle password validation on registration', async ({ page }) => {
    await page.goto('/register');

    const testUserName = generateTestName();
    const testEmail = generateTestEmail();

    // Fill form with weak password
    await page.fill('input[name="name"]', testUserName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');

    await page.click('button[type="submit"]');

    // Should show password validation error
    const errorIndicators = [
      page.locator('text=/password.*too.*short/i'),
      page.locator('text=/password.*must.*contain/i'),
      page.locator('text=/password.*requirements/i'),
      page.locator('[role="alert"]'),
    ];

    let errorFound = false;
    for (const indicator of errorIndicators) {
      if (await indicator.count() > 0) {
        errorFound = true;
        break;
      }
    }

    expect(errorFound).toBeTruthy();
  });
});
