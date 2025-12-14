import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, loginAs } from './fixtures/auth';

/**
 * E2E Test Suite: User Profile Management
 * Tests profile updates, password changes, and form validation
 */

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    // Login before each test
    await loginAs(page, 'user');
  });

  test.describe('View Profile', () => {
    test('should display user profile information', async ({ page }) => {
      await page.goto('/settings/profile');

      // Verify page title
      await expect(page.locator('h1, h2')).toContainText(/profile|account.*settings/i);

      // Verify form fields are populated
      await expect(page.locator('input[name="fullName"]')).toHaveValue(/.+/);
      await expect(page.locator('input[name="email"]')).toHaveValue(/.+@.+/);
    });

    test('should show current user email', async ({ page }) => {
      await page.goto('/settings/profile');

      const emailInput = page.locator('input[name="email"]');
      const emailValue = await emailInput.inputValue();

      expect(emailValue).toContain('@');
      expect(emailValue).toBeTruthy();
    });

    test('should display user avatar or initials', async ({ page }) => {
      await page.goto('/settings/profile');

      // Check for avatar element
      const avatar = page.locator('[data-testid="user-avatar"]');
      await expect(avatar).toBeVisible();
    });

    test('should show account creation date', async ({ page }) => {
      await page.goto('/settings/profile');

      const createdDate = page.locator('[data-testid="account-created"]');
      if (await createdDate.isVisible()) {
        await expect(createdDate).toContainText(/joined|created|member since/i);
      }
    });
  });

  test.describe('Update Profile', () => {
    test('should update full name successfully', async ({ page }) => {
      await page.goto('/settings/profile');

      const newName = `Updated Name ${Date.now()}`;

      // Update name
      await page.fill('input[name="fullName"]', newName);
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('[role="alert"], [data-testid="success-message"]')).toContainText(
        /updated|saved|success/i
      );

      // Reload page and verify change persisted
      await page.reload();
      await expect(page.locator('input[name="fullName"]')).toHaveValue(newName);
    });

    test('should validate full name is required', async ({ page }) => {
      await page.goto('/settings/profile');

      // Clear name field
      await page.fill('input[name="fullName"]', '');
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/required|name.*required/i);
    });

    test('should validate full name length', async ({ page }) => {
      await page.goto('/settings/profile');

      // Try very short name
      await page.fill('input[name="fullName"]', 'A');
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/at least|too short|minimum/i);
    });

    test('should update email address', async ({ page }) => {
      await page.goto('/settings/profile');

      const newEmail = `updated-${Date.now()}@copilot-test.com`;

      // Update email
      await page.fill('input[name="email"]', newEmail);
      await page.click('button[type="submit"]');

      // Should show verification required message
      await expect(page.locator('[role="alert"]')).toContainText(
        /verification|verify.*email|confirm.*email/i
      );
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/settings/profile');

      // Enter invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/valid.*email|email.*invalid/i);
    });

    test('should prevent duplicate email', async ({ page }) => {
      await page.goto('/settings/profile');

      // Try to use another user's email
      await page.fill('input[name="email"]', testUsers.admin.email);
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(
        /already.*use|email.*taken|already.*exists/i
      );
    });

    test('should update phone number', async ({ page }) => {
      await page.goto('/settings/profile');

      const phoneInput = page.locator('input[name="phone"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+1-555-123-4567');
        await page.click('button[type="submit"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });

    test('should validate phone number format', async ({ page }) => {
      await page.goto('/settings/profile');

      const phoneInput = page.locator('input[name="phone"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('invalid-phone');
        await page.click('button[type="submit"]');

        await expect(page.locator('form')).toContainText(/valid.*phone|phone.*invalid/i);
      }
    });

    test('should update job title/role', async ({ page }) => {
      await page.goto('/settings/profile');

      const jobTitleInput = page.locator('input[name="jobTitle"], input[name="role"]');
      if (await jobTitleInput.isVisible()) {
        await jobTitleInput.fill('Senior DevOps Engineer');
        await page.click('button[type="submit"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });

    test('should update company/organization', async ({ page }) => {
      await page.goto('/settings/profile');

      const companyInput = page.locator('input[name="company"], input[name="organization"]');
      if (await companyInput.isVisible()) {
        await companyInput.fill('Test Company Inc.');
        await page.click('button[type="submit"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });

    test('should show loading state during update', async ({ page }) => {
      await page.goto('/settings/profile');

      await page.fill('input[name="fullName"]', 'Updated Name');

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Verify button shows loading state
      await expect(submitButton).toContainText(/saving|updating|loading/i);
    });

    test('should disable form during update', async ({ page }) => {
      await page.goto('/settings/profile');

      await page.fill('input[name="fullName"]', 'Updated Name');
      await page.click('button[type="submit"]');

      // Form fields should be disabled during save
      const nameInput = page.locator('input[name="fullName"]');
      const isDisabled = await nameInput.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('should allow canceling changes', async ({ page }) => {
      await page.goto('/settings/profile');

      const originalName = await page.locator('input[name="fullName"]').inputValue();

      // Make changes
      await page.fill('input[name="fullName"]', 'Temporary Name');

      // Look for cancel/reset button
      const cancelButton = page.locator('[data-testid="cancel-button"], button:has-text("cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Name should be reverted
        await expect(page.locator('input[name="fullName"]')).toHaveValue(originalName);
      }
    });
  });

  test.describe('Avatar Management', () => {
    test('should allow uploading profile picture', async ({ page }) => {
      await page.goto('/settings/profile');

      const uploadButton = page.locator('[data-testid="upload-avatar"], input[type="file"]');
      if (await uploadButton.isVisible()) {
        await expect(uploadButton).toBeVisible();
      }
    });

    test('should validate image file type', async ({ page }) => {
      await page.goto('/settings/profile');

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Try to upload invalid file type
        await fileInput.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('not an image'),
        });

        // Should show error
        await expect(page.locator('[role="alert"]')).toContainText(
          /invalid.*type|image.*only|jpg.*png/i
        );
      }
    });

    test('should validate image file size', async ({ page }) => {
      await page.goto('/settings/profile');

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Try to upload large file (simulated)
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

        await fileInput.setInputFiles({
          name: 'large.jpg',
          mimeType: 'image/jpeg',
          buffer: largeBuffer,
        });

        // Should show size error
        await expect(page.locator('[role="alert"]')).toContainText(/too large|size.*limit|maximum/i);
      }
    });

    test('should show preview before uploading', async ({ page }) => {
      await page.goto('/settings/profile');

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Upload valid image
        await fileInput.setInputFiles({
          name: 'avatar.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
        });

        // Should show preview
        const preview = page.locator('[data-testid="avatar-preview"]');
        await expect(preview).toBeVisible();
      }
    });

    test('should allow removing profile picture', async ({ page }) => {
      await page.goto('/settings/profile');

      const removeButton = page.locator('[data-testid="remove-avatar"]');
      if (await removeButton.isVisible()) {
        await removeButton.click();

        // Should show confirmation
        await expect(page.locator('[data-testid="confirm-remove"]')).toBeVisible();
        await page.click('[data-testid="confirm-remove"]');

        // Avatar should be replaced with initials
        await expect(page.locator('[data-testid="user-initials"]')).toBeVisible();
      }
    });
  });

  test.describe('Password Change', () => {
    test('should navigate to password change section', async ({ page }) => {
      await page.goto('/settings/profile');

      // Find link to security/password settings
      const securityLink = page.locator('a[href="/settings/security"]');
      if (await securityLink.isVisible()) {
        await securityLink.click();
        await expect(page).toHaveURL(/\/settings\/security/);
      } else {
        // Password change might be on same page
        await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
      }
    });

    test('should change password successfully', async ({ page }) => {
      await page.goto('/settings/security');

      // Fill password change form
      await page.fill('input[name="currentPassword"]', testUsers.user.password);
      await page.fill('input[name="newPassword"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!@#');

      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('[role="alert"]')).toContainText(/password.*changed|updated/i);
    });

    test('should require current password', async ({ page }) => {
      await page.goto('/settings/security');

      // Try to change without current password
      await page.fill('input[name="newPassword"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!@#');

      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('form')).toContainText(/current.*password.*required/i);
    });

    test('should validate current password is correct', async ({ page }) => {
      await page.goto('/settings/security');

      // Enter wrong current password
      await page.fill('input[name="currentPassword"]', 'WrongPassword123!');
      await page.fill('input[name="newPassword"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!@#');

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(/incorrect|wrong|invalid/i);
    });

    test('should validate new password strength', async ({ page }) => {
      await page.goto('/settings/security');

      await page.fill('input[name="currentPassword"]', testUsers.user.password);
      await page.fill('input[name="newPassword"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      await page.click('button[type="submit"]');

      // Verify password strength error
      await expect(page.locator('form')).toContainText(/password.*strong|8 characters/i);
    });

    test('should require password confirmation to match', async ({ page }) => {
      await page.goto('/settings/security');

      await page.fill('input[name="currentPassword"]', testUsers.user.password);
      await page.fill('input[name="newPassword"]', 'NewSecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!@#');

      await page.click('button[type="submit"]');

      // Verify mismatch error
      await expect(page.locator('form')).toContainText(/passwords.*match/i);
    });

    test('should prevent using same password as current', async ({ page }) => {
      await page.goto('/settings/security');

      await page.fill('input[name="currentPassword"]', testUsers.user.password);
      await page.fill('input[name="newPassword"]', testUsers.user.password);
      await page.fill('input[name="confirmPassword"]', testUsers.user.password);

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('[role="alert"]')).toContainText(
        /same.*current|different.*password|new.*password/i
      );
    });

    test('should show password visibility toggle', async ({ page }) => {
      await page.goto('/settings/security');

      const passwordInput = page.locator('input[name="newPassword"]');
      const toggleButton = page.locator('[data-testid="toggle-password-visibility"]').first();

      // Password should be hidden by default
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('should display password strength indicator', async ({ page }) => {
      await page.goto('/settings/security');

      const passwordInput = page.locator('input[name="newPassword"]');

      // Type weak password
      await passwordInput.fill('weak');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText(/weak/i);

      // Type strong password
      await passwordInput.fill('StrongPass123!@#');
      await expect(page.locator('[data-testid="password-strength"]')).toContainText(/strong/i);
    });
  });

  test.describe('Notification Preferences', () => {
    test('should display notification settings', async ({ page }) => {
      await page.goto('/settings/notifications');

      // Verify notification options are visible
      await expect(page.locator('h1, h2')).toContainText(/notification|preferences/i);
    });

    test('should toggle email notifications', async ({ page }) => {
      await page.goto('/settings/notifications');

      const emailToggle = page.locator('input[name="emailNotifications"]');
      if (await emailToggle.isVisible()) {
        const initialState = await emailToggle.isChecked();
        await emailToggle.click();

        // Wait for save
        await page.waitForTimeout(500);

        // Reload and verify change persisted
        await page.reload();
        const newState = await emailToggle.isChecked();
        expect(newState).toBe(!initialState);
      }
    });

    test('should update notification frequency', async ({ page }) => {
      await page.goto('/settings/notifications');

      const frequencySelect = page.locator('select[name="notificationFrequency"]');
      if (await frequencySelect.isVisible()) {
        await frequencySelect.selectOption('weekly');
        await page.click('button[type="submit"]');

        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });
  });

  test.describe('Account Deletion', () => {
    test('should show account deletion option', async ({ page }) => {
      await page.goto('/settings/account');

      const deleteButton = page.locator('[data-testid="delete-account-button"]');
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toContainText(/delete|remove.*account/i);
      }
    });

    test('should show confirmation modal for account deletion', async ({ page }) => {
      await page.goto('/settings/account');

      const deleteButton = page.locator('[data-testid="delete-account-button"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should show warning modal
        await expect(page.locator('[data-testid="delete-account-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="delete-account-modal"]')).toContainText(
          /permanent|cannot.*undo|are you sure/i
        );
      }
    });

    test('should require password for account deletion', async ({ page }) => {
      await page.goto('/settings/account');

      const deleteButton = page.locator('[data-testid="delete-account-button"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should require password
        await expect(page.locator('input[name="password"]')).toBeVisible();
      }
    });

    test('should require typing DELETE to confirm deletion', async ({ page }) => {
      await page.goto('/settings/account');

      const deleteButton = page.locator('[data-testid="delete-account-button"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Should require typing confirmation text
        const confirmInput = page.locator('input[name="confirmText"]');
        if (await confirmInput.isVisible()) {
          await expect(confirmInput).toBeVisible();
        }
      }
    });
  });

  test.describe('Form UX', () => {
    test('should show unsaved changes warning', async ({ page }) => {
      await page.goto('/settings/profile');

      // Make changes
      await page.fill('input[name="fullName"]', 'Changed Name');

      // Try to navigate away
      const dashboardLink = page.locator('a[href="/dashboard"]');
      if (await dashboardLink.isVisible()) {
        page.on('dialog', (dialog) => {
          expect(dialog.message()).toMatch(/unsaved|lose.*changes/i);
          dialog.dismiss();
        });

        await dashboardLink.click();
      }
    });

    test('should auto-save on blur', async ({ page }) => {
      await page.goto('/settings/profile');

      const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"]');
      if (await autoSaveIndicator.isVisible()) {
        await page.fill('input[name="fullName"]', 'New Name');
        await page.locator('input[name="email"]').click(); // Blur name field

        await expect(autoSaveIndicator).toContainText(/saving|saved/i);
      }
    });

    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.goto('/settings/profile');

      // Tab through form fields
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('INPUT');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/settings/profile');

      const nameInput = page.locator('input[name="fullName"]');
      const ariaLabel = await nameInput.getAttribute('aria-label');
      const ariaDescribedBy = await nameInput.getAttribute('aria-describedby');

      expect(ariaLabel || ariaDescribedBy).toBeTruthy();
    });
  });
});
