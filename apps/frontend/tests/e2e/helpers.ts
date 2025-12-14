import { Page, expect } from '@playwright/test';

/**
 * Helper utilities for E2E tests
 * Cloud Governance Copilot
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export const TEST_USERS = {
  demo: {
    email: 'demo@example.com',
    password: 'Demo123!@#',
  },
  admin: {
    email: 'admin@cloudcopilot.com',
    password: 'Admin123!@#',
  },
};

/**
 * Login helper function
 */
export async function login(page: Page, credentials: LoginCredentials = TEST_USERS.demo) {
  await page.goto('/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]');
  // Click logout button
  await page.click('text=Logout');
  // Wait for redirect to login
  await page.waitForURL(/\/login/);
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
) {
  return await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Check if element is visible with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
) {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Fill form field and validate
 */
export async function fillFormField(
  page: Page,
  selector: string,
  value: string
) {
  const field = page.locator(selector);
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test${timestamp}@example.com`;
}

/**
 * Generate unique test name
 */
export function generateTestName(): string {
  const timestamp = Date.now();
  return `Test User ${timestamp}`;
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  page: Page,
  message: string | RegExp,
  timeout: number = 5000
) {
  const toastSelector = typeof message === 'string'
    ? `text=${message}`
    : message.toString();

  await expect(page.locator('[role="status"], .toast, [data-testid="toast"]').filter({ hasText: message }))
    .toBeVisible({ timeout });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Check if page has error message
 */
export async function checkForErrors(page: Page): Promise<boolean> {
  const errorSelectors = [
    '[role="alert"]',
    '.error',
    '[data-testid="error"]',
    'text=/error/i',
    'text=/failed/i',
  ];

  for (const selector of errorSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToComplete(page: Page) {
  // Wait for common loading indicators to disappear
  await page.waitForSelector('[data-testid="loading"], .loading, .spinner', {
    state: 'hidden',
    timeout: 15000
  }).catch(() => {
    // Ignore if loading indicator doesn't exist
  });
}

/**
 * Navigate to section with wait
 */
export async function navigateToSection(page: Page, href: string) {
  await page.click(`a[href="${href}"]`);
  await page.waitForURL(new RegExp(href));
  await waitForLoadingToComplete(page);
}

/**
 * Clear and fill input
 */
export async function clearAndFill(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await input.clear();
  await input.fill(value);
}

/**
 * Select option from dropdown
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await page.selectOption(selector, value);
}

/**
 * Click button with text
 */
export async function clickButton(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Wait for table to load
 */
export async function waitForTableData(page: Page, tableSelector: string) {
  await expect(page.locator(tableSelector)).toBeVisible();
  // Wait for at least one row (excluding header)
  await expect(page.locator(`${tableSelector} tbody tr`).first()).toBeVisible({ timeout: 10000 });
}
