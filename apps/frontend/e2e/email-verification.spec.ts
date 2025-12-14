import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, registerUser } from './fixtures/auth';

/**
 * E2E Test Suite: Email Verification Flow
 * Tests email verification process, banner display, and resend functionality
 */

test.describe('Email Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test.describe('Verification Banner', () => {
    test('should show verification banner for unverified users', async ({ page }) => {
      // Login with unverified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      // Wait for redirect (might go to dashboard or verification page)
      await page.waitForLoadState('networkidle');

      // Verify banner is displayed
      const banner = page.locator('[data-testid="verification-banner"], [role="alert"]');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(/verify.*email|email.*not.*verified|check.*inbox/i);
    });

    test('should not show verification banner for verified users', async ({ page }) => {
      // Login with verified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Verify banner is NOT displayed
      const banner = page.locator('[data-testid="verification-banner"]');
      await expect(banner).not.toBeVisible();
    });

    test('should show resend button in verification banner', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      // Verify resend button exists
      const resendButton = page.locator(
        '[data-testid="resend-verification-button"], button:has-text("resend")'
      );
      await expect(resendButton).toBeVisible();
    });

    test('should be dismissible but persist on reload', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      // Find and click dismiss button (if exists)
      const dismissButton = page.locator('[data-testid="dismiss-banner"], [aria-label="dismiss"]');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();

        // Banner should be hidden
        const banner = page.locator('[data-testid="verification-banner"]');
        await expect(banner).not.toBeVisible();

        // Reload page
        await page.reload();

        // Banner should reappear after reload
        await expect(banner).toBeVisible();
      }
    });
  });

  test.describe('Verification Page', () => {
    test('should show verification page after registration', async ({ page }) => {
      const timestamp = Date.now();
      const newUser = {
        email: `verify-test-${timestamp}@copilot-test.com`,
        password: 'SecurePass123!@#',
        fullName: 'Verify Test User',
      };

      await registerUser(page, newUser);

      // Should be on verification page
      await expect(page).toHaveURL(/\/verify-email/);

      // Verify page content
      await expect(page.locator('h1, h2')).toContainText(/verify.*email|check.*email/i);
      await expect(page.locator('text=/sent.*email|verification.*sent/i')).toBeVisible();
      await expect(page.locator(`text=/${newUser.email}/i`)).toBeVisible();
    });

    test('should display user email address on verification page', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      // Navigate to verify-email page if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/verify-email')) {
        await page.goto('/verify-email');
      }

      // Verify user's email is displayed
      await expect(page.locator(`text=/${testUsers.unverified.email}/i`)).toBeVisible();
    });

    test('should show instructions for verification', async ({ page }) => {
      await page.goto('/verify-email');

      // Verify helpful instructions are shown
      const instructions = page.locator('[data-testid="verification-instructions"]');
      if (await instructions.isVisible()) {
        await expect(instructions).toContainText(/click.*link|check.*inbox|spam folder/i);
      } else {
        // Fallback: check for instruction text anywhere on page
        await expect(page.locator('body')).toContainText(/click.*link|check.*inbox/i);
      }
    });

    test('should redirect authenticated verified users away from verification page', async ({
      page,
    }) => {
      // Login with verified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Try to access verification page
      await page.goto('/verify-email');

      // Should redirect back to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    });
  });

  test.describe('Resend Verification Email', () => {
    test('should resend verification email when button clicked', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      // Click resend button
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await resendButton.click();

      // Verify success message
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /email.*sent|verification.*sent|check.*inbox/i
      );
    });

    test('should disable resend button after clicking', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await resendButton.click();

      // Button should be disabled or show cooldown
      await page.waitForTimeout(500);
      const isDisabled = await resendButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should show cooldown timer after resending', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      await resendButton.click();

      // Check for cooldown timer
      await expect(resendButton).toContainText(/\d+s|wait|seconds/i);
    });

    test('should enforce rate limiting on resend requests', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      const resendButton = page.locator('[data-testid="resend-verification-button"]');

      // Try to click multiple times rapidly
      for (let i = 0; i < 3; i++) {
        if (!(await resendButton.isDisabled())) {
          await resendButton.click();
          await page.waitForTimeout(100);
        }
      }

      // Should show rate limit message or button should be disabled
      const isDisabled = await resendButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('Email Verification with Token', () => {
    test('should verify email with valid token', async ({ page }) => {
      const validToken = 'valid-verification-token-123456';

      // Navigate to verification URL with token
      await page.goto(`/verify-email?token=${validToken}`);

      // Should show success message
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /email.*verified|verification.*successful|account.*activated/i
      );

      // Should redirect to dashboard or login
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
    });

    test('should handle invalid verification token', async ({ page }) => {
      const invalidToken = 'invalid-token-123';

      await page.goto(`/verify-email?token=${invalidToken}`);

      // Should show error message
      await expect(page.locator('[role="alert"], [data-testid="error-message"]')).toContainText(
        /invalid.*token|invalid.*link|verification.*failed/i
      );
    });

    test('should handle expired verification token', async ({ page }) => {
      const expiredToken = 'expired-verification-token-123456';

      await page.goto(`/verify-email?token=${expiredToken}`);

      // Should show error message about expiration
      await expect(page.locator('[role="alert"]')).toContainText(
        /expired|link.*expired|no longer valid/i
      );

      // Should show resend option
      await expect(page.locator('button:has-text("resend"), a:has-text("resend")')).toBeVisible();
    });

    test('should prevent token reuse', async ({ page }) => {
      const usedToken = 'used-verification-token-123456';

      // First use
      await page.goto(`/verify-email?token=${usedToken}`);

      // Wait for success
      await page.waitForTimeout(1000);

      // Try to use again
      await page.goto(`/verify-email?token=${usedToken}`);

      // Should show already verified message or error
      await expect(page.locator('[role="alert"]')).toContainText(
        /already.*verified|invalid.*token|no longer valid/i
      );
    });

    test('should auto-login after successful verification', async ({ page }) => {
      const validToken = 'valid-verification-token-123456';

      await page.goto(`/verify-email?token=${validToken}`);

      // Should redirect to dashboard (auto-login)
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Verify user menu is visible (indicating logged in)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Restricted Access for Unverified Users', () => {
    test('should allow basic access to unverified users', async ({ page }) => {
      // Login with unverified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      // Should be able to access dashboard with banner
      const currentUrl = page.url();
      expect(currentUrl.includes('/dashboard') || currentUrl.includes('/verify-email')).toBeTruthy();
    });

    test('should restrict certain features for unverified users', async ({ page }) => {
      // Login with unverified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.unverified.email);
      await page.fill('input[name="password"]', testUsers.unverified.password);
      await page.click('button[type="submit"]');

      await page.waitForLoadState('networkidle');

      // Try to access premium/restricted features
      // For example, cloud accounts
      await page.goto('/cloud-accounts');

      // Should either redirect or show restriction message
      const restrictionMessage = page.locator('[data-testid="verification-required"]');
      const isRestricted = await restrictionMessage.isVisible();

      if (isRestricted) {
        await expect(restrictionMessage).toContainText(/verify.*email|email.*verification/i);
      }
    });
  });

  test.describe('Email Change Verification', () => {
    test('should require verification when email is changed', async ({ page }) => {
      // Login with verified user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Navigate to profile settings
      await page.goto('/settings/profile');

      // Change email address
      const newEmail = `changed-${Date.now()}@copilot-test.com`;
      await page.fill('input[name="email"]', newEmail);
      await page.click('button[type="submit"]');

      // Should show message about verification
      await expect(page.locator('[role="alert"]')).toContainText(
        /verification.*sent|check.*email|verify.*new.*email/i
      );

      // Verification banner should appear
      const banner = page.locator('[data-testid="verification-banner"]');
      await expect(banner).toBeVisible();
    });
  });

  test.describe('User Experience', () => {
    test('should provide clear visual feedback during verification', async ({ page }) => {
      const validToken = 'valid-verification-token-123456';

      await page.goto(`/verify-email?token=${validToken}`);

      // Should show loading state
      const loadingIndicator = page.locator('[data-testid="verification-loading"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toContainText(/verifying|please wait/i);
      }

      // Then success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should have helpful error recovery options', async ({ page }) => {
      const invalidToken = 'invalid-token-123';

      await page.goto(`/verify-email?token=${invalidToken}`);

      // Should show error
      await expect(page.locator('[role="alert"]')).toBeVisible();

      // Should provide options to recover
      const resendButton = page.locator('button:has-text("resend")');
      const contactSupport = page.locator('a:has-text("support"), a:has-text("help")');

      const hasRecoveryOptions = (await resendButton.isVisible()) || (await contactSupport.isVisible());
      expect(hasRecoveryOptions).toBeTruthy();
    });

    test('should show verification progress indicator', async ({ page }) => {
      await page.goto('/verify-email');

      // Check for progress indicator or steps
      const progressElement = page.locator(
        '[data-testid="verification-progress"], [data-testid="verification-steps"]'
      );

      if (await progressElement.isVisible()) {
        // Verify it shows steps (e.g., "Step 1: Check email", "Step 2: Click link")
        await expect(progressElement).toBeVisible();
      }
    });

    test('should be accessible with screen readers', async ({ page }) => {
      await page.goto('/verify-email');

      // Check for proper ARIA labels and roles
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();

      // Check resend button has proper aria-label
      const resendButton = page.locator('[data-testid="resend-verification-button"]');
      if (await resendButton.isVisible()) {
        const ariaLabel = await resendButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should maintain state during network errors', async ({ page, context }) => {
      // Simulate offline mode
      await context.setOffline(true);

      await page.goto('/verify-email');

      const resendButton = page.locator('[data-testid="resend-verification-button"]');

      if (await resendButton.isVisible()) {
        await resendButton.click();

        // Should show network error
        await expect(page.locator('[role="alert"]')).toContainText(/network|offline|connection/i);

        // Go back online
        await context.setOffline(false);

        // Should be able to retry
        await resendButton.click();

        // Should work now
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });
  });

  test.describe('Security', () => {
    test('should not expose user information in verification URLs', async ({ page }) => {
      const token = 'secure-token-123456';
      await page.goto(`/verify-email?token=${token}`);

      // Check that URL doesn't contain email or user ID
      const url = page.url();
      expect(url.toLowerCase()).not.toContain('@');
      expect(url.toLowerCase()).not.toMatch(/user.*id|user_id|userid/);
    });

    test('should use secure token format', async ({ page }) => {
      const token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';
      await page.goto(`/verify-email?token=${token}`);

      // Verify page loads (token format accepted)
      await expect(page.locator('body')).toBeVisible();

      // Should not expose implementation details in errors
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain('sql');
      expect(pageContent.toLowerCase()).not.toContain('database');
    });

    test('should log verification attempts for security monitoring', async ({ page }) => {
      const invalidToken = 'invalid-token-123';

      // Set up request interception to verify logging
      const requests: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          requests.push({
            url: request.url(),
            method: request.method(),
          });
        }
      });

      await page.goto(`/verify-email?token=${invalidToken}`);

      // Wait for requests to complete
      await page.waitForTimeout(1000);

      // Should have made API call to verify token (which gets logged)
      const verificationRequest = requests.find((r) =>
        r.url.includes('/verify-email') || r.url.includes('/verification')
      );

      expect(verificationRequest).toBeTruthy();
    });
  });
});
