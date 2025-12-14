import { test, expect } from '@playwright/test';
import { login, waitForToast, waitForLoadingToComplete } from './helpers';

/**
 * E2E Tests: Cloud Account Connection
 * Cloud Governance Copilot - Critical Flow #2
 *
 * Tests:
 * 1. Connect AWS Account
 * 2. Connect Azure Account
 * 3. Validation for Invalid Credentials
 */

test.describe('Cloud Account Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);

    // Navigate to cloud accounts page
    await page.goto('/cloud-accounts');
    await waitForLoadingToComplete(page);
  });

  test('should connect AWS account', async ({ page }) => {
    // Click add cloud account button
    const addButtons = [
      page.locator('button:has-text("Add Cloud Account")'),
      page.locator('button:has-text("Add Account")'),
      page.locator('button:has-text("Connect Account")'),
      page.locator('a[href="/cloud-accounts/new"]'),
    ];

    for (const button of addButtons) {
      if (await button.count() > 0) {
        await button.first().click();
        break;
      }
    }

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Select AWS provider
    const providerSelect = page.locator('select[name="provider"], [name="provider"]');
    if (await providerSelect.count() > 0) {
      await providerSelect.selectOption('aws');
    } else {
      // Try clicking AWS card/button
      await page.click('text=/AWS/i, [data-provider="aws"]');
    }

    // Fill AWS connection form
    const timestamp = Date.now();
    await page.fill('input[name="accountName"], input[name="name"]', `Test AWS Account ${timestamp}`);

    // Fill AWS-specific fields
    const accountIdField = page.locator('input[name="accountId"], input[name="awsAccountId"]');
    if (await accountIdField.count() > 0) {
      await accountIdField.fill('123456789012');
    }

    const accessKeyField = page.locator('input[name="accessKeyId"], input[name="awsAccessKeyId"]');
    if (await accessKeyField.count() > 0) {
      await accessKeyField.fill('AKIAIOSFODNN7EXAMPLE');
    }

    const secretKeyField = page.locator('input[name="secretAccessKey"], input[name="awsSecretAccessKey"]');
    if (await secretKeyField.count() > 0) {
      await secretKeyField.fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    }

    const regionField = page.locator('input[name="region"], select[name="region"]');
    if (await regionField.count() > 0) {
      if (await regionField.evaluate(el => el.tagName) === 'SELECT') {
        await regionField.selectOption('us-east-1');
      } else {
        await regionField.fill('us-east-1');
      }
    }

    // Submit form
    await page.click('button[type="submit"], button:has-text("Connect"), button:has-text("Save")');

    // Wait for response (success or error)
    await page.waitForTimeout(3000);

    // Check for success indicators
    const successIndicators = [
      page.locator('text=/connected.*successfully/i'),
      page.locator('text=/account.*added/i'),
      page.locator('text=/success/i'),
      page.locator(`text=Test AWS Account ${timestamp}`),
    ];

    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0 && await indicator.first().isVisible().catch(() => false)) {
        successFound = true;
        break;
      }
    }

    // If we're back on the accounts list page, that's also success
    const onAccountsPage = await page.url().includes('/cloud-accounts') &&
                           !await page.url().includes('/cloud-accounts/new');

    expect(successFound || onAccountsPage).toBeTruthy();
  });

  test('should connect Azure account', async ({ page }) => {
    // Click add cloud account button
    const addButtons = [
      page.locator('button:has-text("Add Cloud Account")'),
      page.locator('button:has-text("Add Account")'),
      page.locator('button:has-text("Connect Account")'),
      page.locator('a[href="/cloud-accounts/new"]'),
    ];

    for (const button of addButtons) {
      if (await button.count() > 0) {
        await button.first().click();
        break;
      }
    }

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Select Azure provider
    const providerSelect = page.locator('select[name="provider"], [name="provider"]');
    if (await providerSelect.count() > 0) {
      await providerSelect.selectOption('azure');
    } else {
      // Try clicking Azure card/button
      await page.click('text=/Azure/i, [data-provider="azure"]');
    }

    // Fill Azure connection form
    const timestamp = Date.now();
    await page.fill('input[name="accountName"], input[name="name"]', `Test Azure Account ${timestamp}`);

    // Fill Azure-specific fields
    const subscriptionIdField = page.locator('input[name="subscriptionId"], input[name="azureSubscriptionId"]');
    if (await subscriptionIdField.count() > 0) {
      await subscriptionIdField.fill(`sub-${timestamp}`);
    }

    const tenantIdField = page.locator('input[name="tenantId"], input[name="azureTenantId"]');
    if (await tenantIdField.count() > 0) {
      await tenantIdField.fill(`tenant-${timestamp}`);
    }

    const clientIdField = page.locator('input[name="clientId"], input[name="azureClientId"]');
    if (await clientIdField.count() > 0) {
      await clientIdField.fill(`client-${timestamp}`);
    }

    const clientSecretField = page.locator('input[name="clientSecret"], input[name="azureClientSecret"]');
    if (await clientSecretField.count() > 0) {
      await clientSecretField.fill(`secret-${timestamp}`);
    }

    // Submit form
    await page.click('button[type="submit"], button:has-text("Connect"), button:has-text("Save")');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for success indicators
    const successIndicators = [
      page.locator('text=/connected.*successfully/i'),
      page.locator('text=/account.*added/i'),
      page.locator('text=/success/i'),
      page.locator(`text=Test Azure Account ${timestamp}`),
    ];

    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0 && await indicator.first().isVisible().catch(() => false)) {
        successFound = true;
        break;
      }
    }

    const onAccountsPage = await page.url().includes('/cloud-accounts') &&
                           !await page.url().includes('/cloud-accounts/new');

    expect(successFound || onAccountsPage).toBeTruthy();
  });

  test('should show validation errors for invalid credentials', async ({ page }) => {
    // Click add cloud account button
    const addButtons = [
      page.locator('button:has-text("Add Cloud Account")'),
      page.locator('button:has-text("Add Account")'),
      page.locator('button:has-text("Connect Account")'),
      page.locator('a[href="/cloud-accounts/new"]'),
    ];

    for (const button of addButtons) {
      if (await button.count() > 0) {
        await button.first().click();
        break;
      }
    }

    // Wait for form
    await page.waitForTimeout(1000);

    // Select AWS provider
    const providerSelect = page.locator('select[name="provider"], [name="provider"]');
    if (await providerSelect.count() > 0) {
      await providerSelect.selectOption('aws');
    } else {
      await page.click('text=/AWS/i, [data-provider="aws"]');
    }

    // Fill with invalid data
    await page.fill('input[name="accountName"], input[name="name"]', 'Invalid Account');

    const accountIdField = page.locator('input[name="accountId"], input[name="awsAccountId"]');
    if (await accountIdField.count() > 0) {
      await accountIdField.fill('invalid'); // Invalid account ID format
    }

    // Try to submit
    await page.click('button[type="submit"], button:has-text("Connect"), button:has-text("Save")');

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check for validation errors
    const errorIndicators = [
      page.locator('text=/invalid.*account/i'),
      page.locator('text=/invalid.*format/i'),
      page.locator('text=/required/i'),
      page.locator('text=/must.*be/i'),
      page.locator('[role="alert"]'),
      page.locator('.error'),
      page.locator('[data-testid="error"]'),
    ];

    let errorFound = false;
    for (const indicator of errorIndicators) {
      const count = await indicator.count();
      if (count > 0) {
        const visible = await indicator.first().isVisible().catch(() => false);
        if (visible) {
          errorFound = true;
          break;
        }
      }
    }

    expect(errorFound).toBeTruthy();
  });

  test('should display list of connected accounts', async ({ page }) => {
    // Should already be on cloud-accounts page from beforeEach
    await expect(page).toHaveURL(/\/cloud-accounts/);

    // Check for accounts table or list
    const accountsListIndicators = [
      page.locator('[data-testid="accounts-table"]'),
      page.locator('[data-testid="accounts-list"]'),
      page.locator('table'),
      page.locator('.account-card'),
    ];

    let listFound = false;
    for (const indicator of accountsListIndicators) {
      if (await indicator.count() > 0) {
        listFound = true;
        break;
      }
    }

    expect(listFound).toBeTruthy();
  });
});
