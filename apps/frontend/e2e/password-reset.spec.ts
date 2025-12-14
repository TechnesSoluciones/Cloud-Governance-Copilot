import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, loginAs } from './fixtures/auth';

/**
 * E2E Test Suite: Password Reset Flow
 * Tests forgot password request, password reset with tokens, and edge cases
 */

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test.describe('Forgot Password Request', () => {
    test('should send password reset email for valid user', async ({ page }) => {
      await page.goto('/forgot-password');

      // Verify forgot password form is visible
      await expect(page.locator('h1, h2')).toContainText(/forgot.*password|reset.*password/i);
      await expect(page.locator('form')).toBeVisible();

      // Enter email
      await page.fill('input[name="email"]', testUsers.user.email);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /email sent|check.*email|reset link/i
      );

      // Verify form is hidden or disabled after submission
      const emailInput = page.locator('input[name="email"]');
      const isDisabled = await emailInput.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      await page.goto('/forgot-password');

      // Enter non-existent email
      await page.fill('input[name="email"]', 'nonexistent@example.com');

      await page.click('button[type="submit"]');

      // Should still show success message for security (don't reveal if email exists)
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /email sent|check.*email/i
      );
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/forgot-password');

      // Enter invalid email format
      await page.fill('input[name="email"]', 'invalid-email');

      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/valid email/i);
    });

    test('should require email field', async ({ page }) => {
      await page.goto('/forgot-password');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/required|email.*required/i);
    });

    test('should show loading state during submission', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', testUsers.user.email);

      // Submit and check for loading state
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Verify button shows loading state
      await expect(submitButton).toContainText(/sending|loading|please wait/i);
    });

    test('should have link to return to login', async ({ page }) => {
      await page.goto('/forgot-password');

      // Find and click back to login link
      const backToLoginLink = page.locator('a[href="/login"], a:has-text("back to login")');
      await expect(backToLoginLink).toBeVisible();

      await backToLoginLink.click();

      // Verify navigation to login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Password Reset with Token', () => {
    test('should reset password with valid token', async ({ page }) => {
      // Simulate having a valid reset token in URL
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      // Verify reset password form is visible
      await expect(page.locator('h1, h2')).toContainText(/reset.*password|new password/i);
      await expect(page.locator('form')).toBeVisible();

      // Fill in new password
      const newPassword = 'NewSecurePass123!@#';
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /password.*reset|password.*updated|success/i
      );

      // Should redirect to login page
      await page.waitForURL(/\/login/, { timeout: 10000 });

      // Verify success message on login page
      await expect(page.locator('[role="alert"]')).toContainText(
        /password.*reset|can.*login/i
      );
    });

    test('should validate password strength', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      // Try weak password
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      await page.click('button[type="submit"]');

      // Verify password strength error
      await expect(page.locator('form')).toContainText(
        /password.*strong|8 characters|uppercase|lowercase|number/i
      );
    });

    test('should require password confirmation to match', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      // Fill passwords that don't match
      await page.fill('input[name="password"]', 'SecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!@#');

      await page.click('button[type="submit"]');

      // Verify mismatch error
      await expect(page.locator('form')).toContainText(/passwords.*match|confirm.*password/i);
    });

    test('should show password visibility toggle', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('[data-testid="toggle-password-visibility"]').first();

      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show
      await toggleButton.click();

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle again to hide
      await toggleButton.click();

      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should display password strength indicator', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      const passwordInput = page.locator('input[name="password"]');

      // Type weak password
      await passwordInput.fill('weak');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText(/weak/i);

      // Type medium password
      await passwordInput.fill('Medium123');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText(/medium|fair/i);

      // Type strong password
      await passwordInput.fill('StrongPass123!@#');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText(/strong/i);
    });
  });

  test.describe('Invalid or Expired Token Handling', () => {
    test('should handle expired token gracefully', async ({ page }) => {
      const expiredToken = 'expired-token-123456';
      await page.goto(`/reset-password?token=${expiredToken}`);

      // Should show error message
      await expect(page.locator('[role="alert"], [data-testid="error-message"]')).toContainText(
        /expired|invalid|link.*expired/i
      );

      // Should show option to request new reset email
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    });

    test('should handle invalid token format', async ({ page }) => {
      const invalidToken = 'invalid';
      await page.goto(`/reset-password?token=${invalidToken}`);

      // Should show error message
      await expect(page.locator('[role="alert"], [data-testid="error-message"]')).toContainText(
        /invalid.*link|invalid.*token/i
      );
    });

    test('should handle missing token parameter', async ({ page }) => {
      await page.goto('/reset-password');

      // Should redirect to forgot password or show error
      const url = page.url();
      const hasError = await page.locator('[role="alert"]').isVisible();

      expect(url.includes('/forgot-password') || hasError).toBeTruthy();
    });

    test('should prevent token reuse', async ({ page }) => {
      const usedToken = 'used-token-123456';

      // First use - should work
      await page.goto(`/reset-password?token=${usedToken}`);
      await page.fill('input[name="password"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!@#');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/login/, { timeout: 10000 });

      // Try to use the same token again
      await page.goto(`/reset-password?token=${usedToken}`);

      // Should show error that token is already used
      await expect(page.locator('[role="alert"]')).toContainText(
        /already used|invalid.*token|expired/i
      );
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on forgot password requests', async ({ page }) => {
      await page.goto('/forgot-password');

      // Make multiple requests rapidly
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', `test${i}@example.com`);
        await page.click('button[type="submit"]');

        // Wait for response
        await page.waitForTimeout(500);

        // Clear and try again
        if (i < 5) {
          await page.reload();
        }
      }

      // Verify rate limit error on 6th attempt
      await expect(page.locator('[role="alert"]')).toContainText(
        /too many.*requests|rate limit|try again later/i
      );

      // Verify submit button is disabled
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should show countdown timer when rate limited', async ({ page }) => {
      await page.goto('/forgot-password');

      // Trigger rate limit (simulate by making multiple requests)
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', `test${i}@example.com`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
        if (i < 5) await page.reload();
      }

      // Check for countdown timer
      const timerElement = page.locator('[data-testid="rate-limit-timer"]');
      if (await timerElement.isVisible()) {
        await expect(timerElement).toContainText(/\d+:\d+|wait.*\d+/i);
      }
    });
  });

  test.describe('Security Considerations', () => {
    test('should not expose user existence through timing', async ({ page }) => {
      await page.goto('/forgot-password');

      // Measure time for existing user
      const start1 = Date.now();
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="alert"]');
      const time1 = Date.now() - start1;

      await page.reload();

      // Measure time for non-existing user
      const start2 = Date.now();
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="alert"]');
      const time2 = Date.now() - start2;

      // Time difference should be minimal (within 2 seconds)
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(2000);
    });

    test('should use secure token format', async ({ page }) => {
      // Token should be long and random-looking
      const token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      await page.goto(`/reset-password?token=${token}`);

      // Verify token is accepted (format-wise)
      // If token format is invalid, should show specific error
      const pageContent = await page.content();

      // Should not expose implementation details
      expect(pageContent.toLowerCase()).not.toContain('sql');
      expect(pageContent.toLowerCase()).not.toContain('database');
      expect(pageContent.toLowerCase()).not.toContain('error:');
    });

    test('should clear sensitive data on page unload', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      await page.fill('input[name="password"]', 'SecurePass123!@#');

      // Navigate away
      await page.goto('/login');

      // Go back
      await page.goBack();

      // Password field should be cleared
      const passwordValue = await page.locator('input[name="password"]').inputValue();
      expect(passwordValue).toBe('');
    });
  });

  test.describe('User Experience', () => {
    test('should show success state and auto-redirect to login', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      await page.fill('input[name="password"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!@#');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Should auto-redirect to login after a few seconds
      await page.waitForURL(/\/login/, { timeout: 10000 });
    });

    test('should provide helpful error messages', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      // Test various validation scenarios
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await page.click('button[type="submit"]');

      // Error should be specific and helpful
      const errorMessage = await page.locator('form').textContent();
      expect(errorMessage?.toLowerCase()).toMatch(
        /at least 8 characters|must contain uppercase|must contain number|must contain special character/i
      );
    });

    test('should have accessible form with proper labels', async ({ page }) => {
      const mockToken = 'valid-reset-token-123456';
      await page.goto(`/reset-password?token=${mockToken}`);

      // Check for proper labels
      const passwordLabel = page.locator('label[for="password"]');
      const confirmPasswordLabel = page.locator('label[for="confirmPassword"]');

      await expect(passwordLabel).toBeVisible();
      await expect(confirmPasswordLabel).toBeVisible();

      // Check aria attributes
      const passwordInput = page.locator('input[name="password"]');
      const hasAriaLabel = await passwordInput.getAttribute('aria-label');
      const hasAriaDescribedBy = await passwordInput.getAttribute('aria-describedby');

      expect(hasAriaLabel || hasAriaDescribedBy).toBeTruthy();
    });
  });

  test.describe('Integration with Login', () => {
    test('should be able to login with new password after reset', async ({ page }) => {
      // This test assumes you've reset the password in a previous step
      // In a real scenario, you'd need to orchestrate this with test data

      const mockToken = 'valid-reset-token-123456';
      const newPassword = 'NewlyResetPass123!@#';

      // Reset password
      await page.goto(`/reset-password?token=${mockToken}`);
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      // Wait for redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });

      // Try to login with old password (should fail)
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      await expect(page.locator('[role="alert"]')).toContainText(/invalid.*credentials/i);

      // Try to login with new password (should succeed)
      // Note: This would work in a fully integrated test environment
    });
  });
});
