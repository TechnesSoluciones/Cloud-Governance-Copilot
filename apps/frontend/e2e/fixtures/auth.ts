import { Page, expect } from '@playwright/test';

/**
 * Base test user interface
 */
interface BaseTestUser {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  totpSecret?: string;
}

/**
 * Test user credentials for E2E testing
 */
export const testUsers: Record<string, BaseTestUser> = {
  admin: {
    email: 'admin@copilot-test.com',
    password: 'AdminTest123!@#',
    fullName: 'Admin Test User',
    role: 'admin',
  },
  user: {
    email: 'user@copilot-test.com',
    password: 'UserTest123!@#',
    fullName: 'Regular Test User',
    role: 'user',
  },
  unverified: {
    email: 'unverified@copilot-test.com',
    password: 'UnverifiedTest123!@#',
    fullName: 'Unverified Test User',
    emailVerified: false,
  },
  mfaEnabled: {
    email: 'mfa@copilot-test.com',
    password: 'MfaTest123!@#',
    fullName: 'MFA Test User',
    mfaEnabled: true,
    totpSecret: 'JBSWY3DPEHPK3PXP', // Test TOTP secret
  },
};

/**
 * Helper function to login as a specific user type
 */
export async function loginAs(
  page: Page,
  userType: keyof typeof testUsers,
  options?: { skipMFA?: boolean }
): Promise<void> {
  const user = testUsers[userType];

  // Navigate to login page
  await page.goto('/login');

  // Wait for the login form to be visible
  await expect(page.locator('form')).toBeVisible();

  // Fill in credentials
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Handle MFA if enabled and not skipped
  if (user.mfaEnabled && !options?.skipMFA && user.totpSecret) {
    await handleMFAPrompt(page, user.totpSecret);
  }

  // Wait for successful redirect (either to dashboard or email verification)
  await page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 10000 });
}

/**
 * Helper function to register a new user
 */
export async function registerUser(
  page: Page,
  userData: {
    email: string;
    password: string;
    fullName: string;
  }
): Promise<void> {
  await page.goto('/register');

  await expect(page.locator('form')).toBeVisible();

  await page.fill('input[name="fullName"]', userData.fullName);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);

  await page.click('button[type="submit"]');

  // Wait for redirect to verification page
  await page.waitForURL('/verify-email', { timeout: 10000 });
}

/**
 * Helper function to logout
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu
  await page.click('[data-testid="user-menu"]');

  // Click logout button
  await page.click('[data-testid="logout-button"]');

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * Helper function to handle MFA prompt
 */
export async function handleMFAPrompt(page: Page, totpSecret: string): Promise<void> {
  // Wait for MFA prompt
  await expect(page.locator('input[name="mfaCode"]')).toBeVisible();

  // Generate TOTP code (you'll need to implement this using speakeasy or similar)
  const code = generateTOTPCode(totpSecret);

  // Enter the code
  await page.fill('input[name="mfaCode"]', code);

  // Submit
  await page.click('button[type="submit"]');
}

/**
 * Helper function to setup MFA for a user
 */
export async function setupMFA(page: Page): Promise<string[]> {
  // Navigate to security settings
  await page.goto('/settings/security');

  // Click enable MFA button
  await page.click('[data-testid="enable-mfa-button"]');

  // Wait for QR code modal
  await expect(page.locator('[data-testid="mfa-qr-code"]')).toBeVisible();

  // Extract TOTP secret from page
  const secret = await page.getAttribute('[data-testid="totp-secret"]', 'data-secret');

  // Generate and enter verification code
  const verificationCode = generateTOTPCode(secret || '');
  await page.fill('input[name="verificationCode"]', verificationCode);

  // Submit
  await page.click('[data-testid="verify-mfa-button"]');

  // Wait for backup codes
  await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();

  // Extract backup codes
  const backupCodesElement = page.locator('[data-testid="backup-code"]');
  const backupCodes = await backupCodesElement.allTextContents();

  // Download/save backup codes
  await page.click('[data-testid="download-backup-codes"]');

  // Confirm
  await page.click('[data-testid="confirm-mfa-setup"]');

  return backupCodes;
}

/**
 * Helper function to disable MFA
 */
export async function disableMFA(page: Page, password: string, totpCode: string): Promise<void> {
  // Navigate to security settings
  await page.goto('/settings/security');

  // Click disable MFA button
  await page.click('[data-testid="disable-mfa-button"]');

  // Wait for confirmation modal
  await expect(page.locator('[data-testid="disable-mfa-modal"]')).toBeVisible();

  // Enter password
  await page.fill('input[name="password"]', password);

  // Enter current TOTP code
  await page.fill('input[name="mfaCode"]', totpCode);

  // Confirm
  await page.click('[data-testid="confirm-disable-mfa"]');

  // Wait for success message
  await expect(page.locator('[data-testid="mfa-disabled-message"]')).toBeVisible();
}

/**
 * Generate TOTP code from secret (simplified version)
 * In production, use speakeasy library
 */
function generateTOTPCode(secret: string): string {
  // This is a placeholder - implement actual TOTP generation
  // using speakeasy or similar library
  // For testing purposes, you might want to use a fixed code
  // or integrate with a TOTP library
  return '123456'; // Placeholder
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to wait for API request
 */
export async function waitForAPIRequest(
  page: Page,
  urlPattern: string | RegExp
): Promise<any> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matches =
        typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return matches;
    },
    { timeout: 10000 }
  );

  return response.json();
}

/**
 * Helper to clear browser storage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.context().clearCookies();

  // Navigate to base URL first to ensure we have a valid origin
  const baseURL = process.env.BASE_URL || 'http://localhost:3010';
  if (page.url() === 'about:blank' || page.url() === '') {
    await page.goto(baseURL);
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
