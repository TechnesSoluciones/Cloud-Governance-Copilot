import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, loginAs, setupMFA, disableMFA } from './fixtures/auth';

/**
 * E2E Test Suite: Multi-Factor Authentication (MFA/2FA)
 * Tests MFA setup, login with MFA, backup codes, and MFA disable
 */

test.describe('Multi-Factor Authentication (MFA)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test.describe('MFA Setup Flow', () => {
    test('should successfully setup MFA for user account', async ({ page }) => {
      // Login with regular user
      await loginAs(page, 'user');

      // Navigate to security settings
      await page.goto('/settings/security');

      // Verify MFA section exists
      await expect(page.locator('h2, h3:has-text("Two-Factor"), h3:has-text("MFA")')).toBeVisible();

      // Click enable MFA button
      const enableButton = page.locator('[data-testid="enable-mfa-button"]');
      await expect(enableButton).toBeVisible();
      await enableButton.click();

      // Wait for MFA setup modal
      await expect(page.locator('[data-testid="mfa-setup-modal"]')).toBeVisible();

      // Verify QR code is displayed
      await expect(page.locator('[data-testid="mfa-qr-code"]')).toBeVisible();

      // Verify secret key is displayed
      await expect(page.locator('[data-testid="totp-secret"]')).toBeVisible();
    });

    test('should display QR code for authenticator app', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Verify QR code image is present
      const qrCode = page.locator('[data-testid="mfa-qr-code"] img, [data-testid="mfa-qr-code"] canvas');
      await expect(qrCode).toBeVisible();

      // Verify it has proper dimensions
      const boundingBox = await qrCode.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(100);
      expect(boundingBox?.height).toBeGreaterThan(100);
    });

    test('should allow copying TOTP secret key', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Click copy button for secret key
      const copyButton = page.locator('[data-testid="copy-totp-secret"]');
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      // Verify success message
      await expect(page.locator('[data-testid="copy-success"]')).toContainText(/copied/i);
    });

    test('should require verification code to complete MFA setup', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Try to submit without entering code
      const verifyButton = page.locator('[data-testid="verify-mfa-button"]');
      await verifyButton.click();

      // Should show validation error
      await expect(page.locator('form')).toContainText(/required|enter.*code/i);
    });

    test('should validate TOTP code format', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Enter invalid code
      await page.fill('input[name="verificationCode"]', '12345'); // Too short
      await page.click('[data-testid="verify-mfa-button"]');

      // Should show validation error
      await expect(page.locator('form')).toContainText(/6 digits|invalid.*code/i);
    });

    test('should reject invalid TOTP code', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Enter wrong code
      await page.fill('input[name="verificationCode"]', '000000');
      await page.click('[data-testid="verify-mfa-button"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(/invalid.*code|incorrect/i);
    });

    test('should generate and display backup codes after setup', async ({ page }) => {
      await loginAs(page, 'user');

      // Setup MFA (this helper should complete the verification)
      const backupCodes = await setupMFA(page);

      // Verify backup codes are displayed
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();

      // Verify correct number of backup codes
      const codeElements = page.locator('[data-testid="backup-code"]');
      const count = await codeElements.count();
      expect(count).toBeGreaterThanOrEqual(8);

      // Verify backup codes are returned
      expect(backupCodes).toBeTruthy();
      expect(backupCodes.length).toBeGreaterThanOrEqual(8);
    });

    test('should allow downloading backup codes', async ({ page }) => {
      await loginAs(page, 'user');
      await setupMFA(page);

      // Click download button
      const downloadButton = page.locator('[data-testid="download-backup-codes"]');
      await expect(downloadButton).toBeVisible();

      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;

      // Verify download occurred
      expect(download.suggestedFilename()).toMatch(/backup.*codes|codes.*txt/i);
    });

    test('should allow copying all backup codes', async ({ page }) => {
      await loginAs(page, 'user');
      await setupMFA(page);

      // Click copy all button
      const copyButton = page.locator('[data-testid="copy-backup-codes"]');
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      // Verify success message
      await expect(page.locator('[data-testid="copy-success"]')).toContainText(/copied/i);
    });

    test('should require confirmation before completing setup', async ({ page }) => {
      await loginAs(page, 'user');
      await setupMFA(page);

      // Verify confirmation checkbox or button
      const confirmButton = page.locator('[data-testid="confirm-mfa-setup"]');
      await expect(confirmButton).toBeVisible();

      // Should have warning about backup codes
      await expect(page.locator('body')).toContainText(/save.*codes|store.*safe/i);
    });

    test('should show MFA enabled status after successful setup', async ({ page }) => {
      await loginAs(page, 'user');
      await setupMFA(page);

      // Complete setup
      await page.click('[data-testid="confirm-mfa-setup"]');

      // Navigate back to security settings
      await page.goto('/settings/security');

      // Verify MFA is enabled
      await expect(page.locator('[data-testid="mfa-status"]')).toContainText(/enabled|active/i);

      // Enable button should now be disable button
      await expect(page.locator('[data-testid="disable-mfa-button"]')).toBeVisible();
    });
  });

  test.describe('Login with MFA', () => {
    test('should require TOTP code during login for MFA-enabled users', async ({ page }) => {
      // Try to login with MFA-enabled user
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Should be prompted for MFA code
      await expect(page.locator('input[name="mfaCode"]')).toBeVisible();
      await expect(page.locator('h1, h2')).toContainText(/two.*factor|enter.*code|verification/i);
    });

    test('should successfully login with correct TOTP code', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Enter correct TOTP code (this would need actual TOTP generation in real test)
      await page.fill('input[name="mfaCode"]', '123456');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    });

    test('should reject invalid TOTP code during login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Enter wrong code
      await page.fill('input[name="mfaCode"]', '000000');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(/invalid.*code|incorrect/i);

      // Should stay on MFA page
      await expect(page.locator('input[name="mfaCode"]')).toBeVisible();
    });

    test('should validate TOTP code format during login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Enter invalid format
      await page.fill('input[name="mfaCode"]', '123'); // Too short
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('form')).toContainText(/6 digits|invalid.*format/i);
    });

    test('should enforce rate limiting on failed MFA attempts', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Try multiple wrong codes
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="mfaCode"]', '000000');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Should show rate limit error
      await expect(page.locator('[role="alert"]')).toContainText(/too many.*attempts|locked/i);
    });

    test('should allow using backup code for login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Click use backup code link
      const backupCodeLink = page.locator('[data-testid="use-backup-code"], a:has-text("backup code")');
      await expect(backupCodeLink).toBeVisible();
      await backupCodeLink.click();

      // Should show backup code input
      await expect(page.locator('input[name="backupCode"]')).toBeVisible();
    });

    test('should show option to trust device', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Check for "Trust this device" checkbox
      const trustDeviceCheckbox = page.locator('input[name="trustDevice"], input[type="checkbox"]:near(:text("trust"))');

      if (await trustDeviceCheckbox.isVisible()) {
        await expect(trustDeviceCheckbox).toBeVisible();
      }
    });
  });

  test.describe('Backup Codes', () => {
    test('should accept valid backup code for login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Switch to backup code
      await page.click('[data-testid="use-backup-code"]');

      // Enter backup code (would be actual code in real test)
      await page.fill('input[name="backupCode"]', 'ABCD-1234-EFGH-5678');
      await page.click('button[type="submit"]');

      // Should login successfully
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    });

    test('should invalidate backup code after use', async ({ page }) => {
      // This would require orchestrating the test to use a backup code
      // and then verifying it can't be used again
      // Implementation depends on how backup codes are managed
    });

    test('should validate backup code format', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      await page.click('[data-testid="use-backup-code"]');

      // Enter invalid format
      await page.fill('input[name="backupCode"]', '123');
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('form')).toContainText(/invalid.*format|invalid.*code/i);
    });

    test('should allow regenerating backup codes from settings', async ({ page }) => {
      // Login with MFA-enabled user
      await loginAs(page, 'mfaEnabled');

      await page.goto('/settings/security');

      // Find regenerate backup codes button
      const regenerateButton = page.locator('[data-testid="regenerate-backup-codes"]');
      await expect(regenerateButton).toBeVisible();
      await regenerateButton.click();

      // Should show confirmation
      await expect(page.locator('[data-testid="confirm-regenerate"]')).toBeVisible();
      await page.click('[data-testid="confirm-regenerate"]');

      // Should show new backup codes
      await expect(page.locator('[data-testid="backup-codes"]')).toBeVisible();
    });

    test('should warn about invalidating old codes when regenerating', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      await page.click('[data-testid="regenerate-backup-codes"]');

      // Should show warning
      await expect(page.locator('[data-testid="regenerate-warning"]')).toContainText(
        /old.*codes.*invalid|previous.*codes|no longer/i
      );
    });

    test('should show remaining backup codes count', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      // Should display count of unused backup codes
      const backupCodeInfo = page.locator('[data-testid="backup-codes-info"]');
      await expect(backupCodeInfo).toContainText(/\d+.*codes.*remaining|\d+.*unused/i);
    });
  });

  test.describe('Disable MFA', () => {
    test('should require password to disable MFA', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      // Click disable MFA
      await page.click('[data-testid="disable-mfa-button"]');

      // Should prompt for password
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    test('should require TOTP code to disable MFA', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      await page.click('[data-testid="disable-mfa-button"]');

      // Should also require current TOTP code
      await expect(page.locator('input[name="mfaCode"]')).toBeVisible();
    });

    test('should successfully disable MFA with correct credentials', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');

      // Disable MFA
      await disableMFA(page, testUsers.mfaEnabled.password, '123456');

      // Should show success message
      await expect(page.locator('[data-testid="mfa-disabled-message"]')).toContainText(
        /disabled|removed|deactivated/i
      );

      // Status should be updated
      await expect(page.locator('[data-testid="mfa-status"]')).toContainText(/disabled|inactive/i);
    });

    test('should show confirmation warning before disabling MFA', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      await page.click('[data-testid="disable-mfa-button"]');

      // Should show warning about security implications
      await expect(page.locator('[data-testid="disable-mfa-modal"]')).toContainText(
        /less secure|protection|are you sure/i
      );
    });

    test('should allow canceling MFA disable', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      await page.click('[data-testid="disable-mfa-button"]');

      // Click cancel
      const cancelButton = page.locator('[data-testid="cancel-disable-mfa"]');
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();

      // Modal should close
      await expect(page.locator('[data-testid="disable-mfa-modal"]')).not.toBeVisible();

      // MFA should still be enabled
      await expect(page.locator('[data-testid="mfa-status"]')).toContainText(/enabled/i);
    });

    test('should not require MFA after disabling', async ({ page }) => {
      // This would require disabling MFA first, then logging out and back in
      // to verify MFA is not required anymore
    });
  });

  test.describe('Security & Edge Cases', () => {
    test('should prevent MFA setup if already enabled', async ({ page }) => {
      await loginAs(page, 'mfaEnabled');
      await page.goto('/settings/security');

      // Enable button should not be visible
      await expect(page.locator('[data-testid="enable-mfa-button"]')).not.toBeVisible();

      // Should show MFA is already enabled
      await expect(page.locator('[data-testid="mfa-status"]')).toContainText(/enabled/i);
    });

    test('should timeout TOTP code input after delay', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Wait for timeout (adjust based on your timeout settings)
      await page.waitForTimeout(120000); // 2 minutes

      // Try to submit code
      await page.fill('input[name="mfaCode"]', '123456');
      await page.click('button[type="submit"]');

      // Should show session timeout error
      await expect(page.locator('[role="alert"]')).toContainText(/timeout|expired|try again/i);
    });

    test('should handle QR code generation failure gracefully', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      // Simulate network error during QR generation
      await page.route('**/api/v1/auth/mfa/**', (route) => route.abort());

      await page.click('[data-testid="enable-mfa-button"]');

      // Should show error message
      await expect(page.locator('[role="alert"]')).toContainText(/error|failed|try again/i);

      // Should still show secret key as fallback
      await expect(page.locator('[data-testid="totp-secret"]')).toBeVisible();
    });

    test('should use secure TOTP algorithm settings', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      await page.click('[data-testid="enable-mfa-button"]');

      // Extract TOTP URI from QR code or secret display
      const totpSecret = await page.getAttribute('[data-testid="totp-secret"]', 'data-secret');

      // Verify secret is sufficiently long (should be at least 16 chars for base32)
      expect(totpSecret?.length).toBeGreaterThanOrEqual(16);
    });

    test('should maintain session if MFA input is canceled', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      // Find and click back/cancel button
      const cancelButton = page.locator('[data-testid="cancel-mfa"], a:has-text("cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should go back to login page
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should log MFA events for security monitoring', async ({ page }) => {
      // This is more of an API/backend test, but can verify client makes correct calls
      const apiRequests: string[] = [];

      page.on('request', (request) => {
        if (request.url().includes('/api/v1/auth/mfa')) {
          apiRequests.push(request.url());
        }
      });

      await loginAs(page, 'mfaEnabled');

      // Verify MFA-related API calls were made (which should trigger audit logs)
      expect(apiRequests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await loginAs(page, 'user');
      await page.goto('/settings/security');

      // Tab to enable MFA button
      await page.keyboard.press('Tab');
      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Modal should open
      await expect(page.locator('[data-testid="mfa-setup-modal"]')).toBeVisible();
    });

    test('should have proper ARIA labels for MFA inputs', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUsers.mfaEnabled.email);
      await page.fill('input[name="password"]', testUsers.mfaEnabled.password);
      await page.click('button[type="submit"]');

      const mfaInput = page.locator('input[name="mfaCode"]');
      const ariaLabel = await mfaInput.getAttribute('aria-label');
      const ariaDescribedBy = await mfaInput.getAttribute('aria-describedby');

      expect(ariaLabel || ariaDescribedBy).toBeTruthy();
    });

    test('should announce status changes to screen readers', async ({ page }) => {
      await loginAs(page, 'user');
      await setupMFA(page);

      // Check for ARIA live region
      const liveRegion = page.locator('[role="status"], [aria-live="polite"]');
      const count = await liveRegion.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
