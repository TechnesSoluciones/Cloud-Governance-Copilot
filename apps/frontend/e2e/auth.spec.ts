import { test, expect } from '@playwright/test';
import { loginAs, registerUser, logout, testUsers, clearStorage } from './fixtures/auth';

/**
 * E2E Test Suite: Authentication Flow
 * Tests user registration, login, logout, and session management
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test to ensure clean state
    await clearStorage(page);
  });

  test.describe('User Registration', () => {
    test('should register new user with valid data', async ({ page }) => {
      const timestamp = Date.now();
      const newUser = {
        email: `test-${timestamp}@copilot-test.com`,
        password: 'SecurePass123!@#',
        fullName: 'Test User',
      };

      await page.goto('/register');

      // Verify registration form is visible
      await expect(page.locator('h1')).toContainText(/sign up|register/i);
      await expect(page.locator('form')).toBeVisible();

      // Fill registration form
      await page.fill('input[name="fullName"]', newUser.fullName);
      await page.fill('input[name="email"]', newUser.email);
      await page.fill('input[name="password"]', newUser.password);

      // Check terms checkbox if required
      const termsCheckbox = page.locator('input[type="checkbox"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      // Submit form
      await page.click('button[type="submit"]');

      // Verify redirect to email verification or dashboard
      await page.waitForURL(/\/(verify-email|dashboard)/, { timeout: 10000 });

      // Verify success message or welcome message
      const successIndicator = page.locator(
        '[data-testid="success-message"], [role="alert"]'
      );
      if (await successIndicator.isVisible()) {
        await expect(successIndicator).toContainText(/success|welcome|verify/i);
      }
    });

    test('should display validation errors for invalid data', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Verify validation errors are shown
      await expect(page.locator('form')).toContainText(/required|invalid/i);
    });

    test('should reject weak passwords', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="fullName"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'weak'); // Weak password

      await page.click('button[type="submit"]');

      // Verify password validation error
      await expect(page.locator('form')).toContainText(/password.*strong|8 characters/i);
    });

    test('should reject invalid email format', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="fullName"]', 'Test User');
      await page.fill('input[name="email"]', 'invalid-email'); // Invalid format
      await page.fill('input[name="password"]', 'SecurePass123!@#');

      await page.click('button[type="submit"]');

      // Verify email validation error
      await expect(page.locator('form')).toContainText(/valid email/i);
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.goto('/register');

      // Try to register with existing user email
      await page.fill('input[name="fullName"]', 'Test User');
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', 'SecurePass123!@#');

      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('[role="alert"]')).toContainText(
        /already exists|already registered/i
      );
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await loginAs(page, 'user');

      // Verify successful login by checking for dashboard elements
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Try to login with wrong password
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('[role="alert"]')).toContainText(
        /invalid credentials|incorrect password/i
      );

      // Verify still on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should reject non-existent user', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'Password123!');

      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('[role="alert"]')).toContainText(
        /invalid credentials|user not found/i
      );
    });

    test('should display validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Verify validation errors
      await expect(page.locator('form')).toContainText(/required/i);
    });

    test('should persist session after page reload', async ({ page }) => {
      await loginAs(page, 'user');

      // Reload page
      await page.reload();

      // Verify still authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access protected page while logged out
      await page.goto('/settings/profile');

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });

      // Login
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      // Should redirect back to originally requested page
      await page.waitForURL(/\/settings\/profile/, { timeout: 10000 });
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await loginAs(page, 'user');

      // Logout
      await logout(page);

      // Verify redirected to login page
      await expect(page).toHaveURL(/\/login/);

      // Verify session cleared (try to access protected page)
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should clear all session data on logout', async ({ page }) => {
      // Login first
      await loginAs(page, 'user');

      // Logout
      await logout(page);

      // Check that session cookies are cleared
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find((c) => c.name.includes('session'));
      expect(sessionCookie).toBeUndefined();
    });
  });

  test.describe('Session Management', () => {
    test('should handle expired session gracefully', async ({ page }) => {
      // Login
      await loginAs(page, 'user');

      // Clear session cookie to simulate expiration
      await page.context().clearCookies();

      // Try to access protected resource
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });

      // Should show session expired message
      await expect(page.locator('[role="alert"]')).toContainText(/expired|logged out/i);
    });

    test('should refresh token before expiration', async ({ page }) => {
      await loginAs(page, 'user');

      // Wait for potential token refresh (adjust timing as needed)
      await page.waitForTimeout(5000);

      // Verify still authenticated
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login');

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', testUsers.user.email);
        await page.fill('input[name="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');

        // Wait for response
        await page.waitForTimeout(500);
      }

      // Verify rate limit error on 6th attempt
      await expect(page.locator('[role="alert"]')).toContainText(
        /too many attempts|rate limit|try again later/i
      );

      // Verify submit button is disabled or form shows cooldown
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // List of protected routes
      const protectedRoutes = [
        '/dashboard',
        '/settings/profile',
        '/settings/security',
        '/cloud-accounts',
        '/audit-logs',
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should allow authenticated users to access protected routes', async ({
      page,
    }) => {
      await loginAs(page, 'user');

      // List of protected routes
      const protectedRoutes = ['/dashboard', '/settings/profile', '/cloud-accounts'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page).toHaveURL(route);
      }
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive data in responses', async ({ page }) => {
      await page.goto('/login');

      // Setup request interception
      const responses: any[] = [];
      page.on('response', async (response) => {
        if (response.url().includes('/api/')) {
          try {
            const data = await response.json();
            responses.push(data);
          } catch {
            // Not JSON response
          }
        }
      });

      // Login
      await page.fill('input[name="email"]', testUsers.user.email);
      await page.fill('input[name="password"]', testUsers.user.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Verify no sensitive data in responses
      const allResponseText = JSON.stringify(responses).toLowerCase();
      expect(allResponseText).not.toContain('password');
      expect(allResponseText).not.toContain('secret');
    });

    test('should use secure session cookies', async ({ page }) => {
      await loginAs(page, 'user');

      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find((c) => c.name.includes('session'));

      if (sessionCookie) {
        // Verify cookie security attributes
        expect(sessionCookie.httpOnly).toBeTruthy();
        expect(sessionCookie.secure).toBeTruthy();
        expect(sessionCookie.sameSite).toBe('Strict' || 'Lax');
      }
    });
  });
});
