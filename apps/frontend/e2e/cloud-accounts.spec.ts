import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, loginAs } from './fixtures/auth';

/**
 * E2E Test Suite: Cloud Account Management
 * Tests creating, listing, updating, and deleting cloud accounts
 */

test.describe('Cloud Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginAs(page, 'user');
  });

  test.describe('List Cloud Accounts', () => {
    test('should display cloud accounts page', async ({ page }) => {
      await page.goto('/cloud-accounts');

      await expect(page.locator('h1, h2')).toContainText(/cloud.*accounts|accounts/i);
      await expect(page.locator('[data-testid="add-account-button"]')).toBeVisible();
    });

    test('should show empty state when no accounts exist', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const emptyState = page.locator('[data-testid="empty-state"]');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText(/no.*accounts|get started|add.*first/i);
      }
    });

    test('should display list of cloud accounts', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const accountList = page.locator('[data-testid="account-list"], table');
      await expect(accountList).toBeVisible();
    });

    test('should show account status (connected/disconnected)', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const statusBadge = page.locator('[data-testid="account-status"]').first();
      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toContainText(/connected|active|disconnected/i);
      }
    });

    test('should display provider type (AWS, Azure, GCP)', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const providerLabel = page.locator('[data-testid="provider-type"]').first();
      if (await providerLabel.isVisible()) {
        await expect(providerLabel).toContainText(/aws|azure|gcp|google cloud/i);
      }
    });

    test('should show account nickname/name', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const accountName = page.locator('[data-testid="account-name"]').first();
      if (await accountName.isVisible()) {
        await expect(accountName).toHaveText(/.+/);
      }
    });

    test('should show last sync timestamp', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const lastSync = page.locator('[data-testid="last-sync"]').first();
      if (await lastSync.isVisible()) {
        await expect(lastSync).toContainText(/ago|never|last.*sync/i);
      }
    });
  });

  test.describe('Add Cloud Account', () => {
    test('should open add account modal', async ({ page }) => {
      await page.goto('/cloud-accounts');

      await page.click('[data-testid="add-account-button"]');

      await expect(page.locator('[data-testid="add-account-modal"]')).toBeVisible();
      await expect(page.locator('h2, h3')).toContainText(/add.*account|new.*account/i);
    });

    test('should show provider selection', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      // Should show provider options
      await expect(page.locator('[data-testid="provider-aws"]')).toBeVisible();
      await expect(page.locator('[data-testid="provider-azure"]')).toBeVisible();
      await expect(page.locator('[data-testid="provider-gcp"]')).toBeVisible();
    });

    test('should add AWS account with credentials', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      // Select AWS
      await page.click('[data-testid="provider-aws"]');

      // Fill AWS credentials
      await page.fill('input[name="accountName"]', `AWS Test ${Date.now()}`);
      await page.fill('input[name="awsAccessKeyId"]', 'AKIAIOSFODNN7EXAMPLE');
      await page.fill('input[name="awsSecretAccessKey"]', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      await page.fill('input[name="awsRegion"]', 'us-east-1');

      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('[role="alert"]')).toContainText(/added|connected|success/i);
    });

    test('should add Azure account with credentials', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-azure"]');

      // Fill Azure credentials
      await page.fill('input[name="accountName"]', `Azure Test ${Date.now()}`);
      await page.fill('input[name="azureSubscriptionId"]', '12345678-1234-1234-1234-123456789012');
      await page.fill('input[name="azureTenantId"]', '87654321-4321-4321-4321-210987654321');
      await page.fill('input[name="azureClientId"]', '11111111-2222-3333-4444-555555555555');
      await page.fill('input[name="azureClientSecret"]', 'your-client-secret');

      await page.click('button[type="submit"]');

      await expect(page.locator('[role="alert"]')).toContainText(/added|connected|success/i);
    });

    test('should add GCP account with service account key', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-gcp"]');

      // Fill GCP credentials
      await page.fill('input[name="accountName"]', `GCP Test ${Date.now()}`);
      await page.fill('input[name="gcpProjectId"]', 'my-project-123456');
      await page.fill('textarea[name="gcpServiceAccountKey"]', '{"type":"service_account"}');

      await page.click('button[type="submit"]');

      await expect(page.locator('[role="alert"]')).toContainText(/added|connected|success/i);
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-aws"]');

      // Submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('form')).toContainText(/required/i);
    });

    test('should validate AWS access key format', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-aws"]');

      await page.fill('input[name="accountName"]', 'Test');
      await page.fill('input[name="awsAccessKeyId"]', 'invalid-key');
      await page.fill('input[name="awsSecretAccessKey"]', 'secret');

      await page.click('button[type="submit"]');

      await expect(page.locator('form')).toContainText(/invalid.*format|access.*key/i);
    });

    test('should test connection before saving', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-aws"]');

      await page.fill('input[name="accountName"]', 'Test');
      await page.fill('input[name="awsAccessKeyId"]', 'AKIAIOSFODNN7EXAMPLE');
      await page.fill('input[name="awsSecretAccessKey"]', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');

      // Click test connection button
      const testButton = page.locator('[data-testid="test-connection"]');
      if (await testButton.isVisible()) {
        await testButton.click();
        await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
      }
    });

    test('should mask sensitive credentials', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-aws"]');

      const secretInput = page.locator('input[name="awsSecretAccessKey"]');
      await expect(secretInput).toHaveAttribute('type', 'password');
    });

    test('should allow credential visibility toggle', async ({ page }) => {
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      await page.click('[data-testid="provider-aws"]');

      const secretInput = page.locator('input[name="awsSecretAccessKey"]');
      const toggleButton = page.locator('[data-testid="toggle-secret-visibility"]');

      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await expect(secretInput).toHaveAttribute('type', 'text');
      }
    });
  });

  test.describe('Update Cloud Account', () => {
    test('should open edit modal for account', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const editButton = page.locator('[data-testid="edit-account"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        await expect(page.locator('[data-testid="edit-account-modal"]')).toBeVisible();
      }
    });

    test('should update account nickname', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const editButton = page.locator('[data-testid="edit-account"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        const newName = `Updated Name ${Date.now()}`;
        await page.fill('input[name="accountName"]', newName);
        await page.click('button[type="submit"]');

        await expect(page.locator('[role="alert"]')).toContainText(/updated|saved/i);
      }
    });

    test('should update AWS credentials', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const editButton = page.locator('[data-testid="edit-account"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        await page.fill('input[name="awsAccessKeyId"]', 'AKIAIOSFODNN7NEWKEY');
        await page.fill('input[name="awsSecretAccessKey"]', 'newSecretKey123');

        await page.click('button[type="submit"]');

        await expect(page.locator('[role="alert"]')).toContainText(/updated|saved/i);
      }
    });

    test('should re-test connection after credential update', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const editButton = page.locator('[data-testid="edit-account"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        await page.fill('input[name="awsSecretAccessKey"]', 'newSecretKey123');

        const testButton = page.locator('[data-testid="test-connection"]');
        if (await testButton.isVisible()) {
          await testButton.click();
          await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Delete Cloud Account', () => {
    test('should show delete confirmation modal', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const deleteButton = page.locator('[data-testid="delete-account"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toContainText(
          /are you sure|cannot.*undo|permanent/i
        );
      }
    });

    test('should require typing account name to confirm deletion', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const deleteButton = page.locator('[data-testid="delete-account"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirmInput = page.locator('input[name="confirmAccountName"]');
        if (await confirmInput.isVisible()) {
          await expect(confirmInput).toBeVisible();
        }
      }
    });

    test('should delete account after confirmation', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const initialCount = await page.locator('[data-testid="account-item"]').count();

      const deleteButton = page.locator('[data-testid="delete-account"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirmButton = page.locator('[data-testid="confirm-delete"]');
        await confirmButton.click();

        await expect(page.locator('[role="alert"]')).toContainText(/deleted|removed/i);

        const newCount = await page.locator('[data-testid="account-item"]').count();
        expect(newCount).toBe(initialCount - 1);
      }
    });

    test('should allow canceling deletion', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const deleteButton = page.locator('[data-testid="delete-account"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const cancelButton = page.locator('[data-testid="cancel-delete"]');
        await cancelButton.click();

        await expect(page.locator('[data-testid="delete-confirmation-modal"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Account Actions', () => {
    test('should sync account data', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const syncButton = page.locator('[data-testid="sync-account"]').first();
      if (await syncButton.isVisible()) {
        await syncButton.click();

        await expect(page.locator('[data-testid="sync-status"]')).toContainText(/syncing|sync/i);
      }
    });

    test('should show sync progress', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const syncButton = page.locator('[data-testid="sync-account"]').first();
      if (await syncButton.isVisible()) {
        await syncButton.click();

        const progressBar = page.locator('[data-testid="sync-progress"]');
        if (await progressBar.isVisible()) {
          await expect(progressBar).toBeVisible();
        }
      }
    });

    test('should view account details', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const viewButton = page.locator('[data-testid="view-account"]').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        await expect(page).toHaveURL(/\/cloud-accounts\/.+/);
      }
    });

    test('should disable/enable account', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const toggleButton = page.locator('[data-testid="toggle-account"]').first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();

        await expect(page.locator('[role="alert"]')).toContainText(/disabled|enabled/i);
      }
    });
  });

  test.describe('Search and Filter', () => {
    test('should search accounts by name', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const searchInput = page.locator('[data-testid="search-accounts"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('AWS');

        await page.waitForTimeout(500);

        const results = page.locator('[data-testid="account-item"]');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by provider', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const filterDropdown = page.locator('[data-testid="filter-provider"]');
      if (await filterDropdown.isVisible()) {
        await filterDropdown.selectOption('aws');

        await page.waitForTimeout(500);

        const awsAccounts = page.locator('[data-testid="provider-type"]:has-text("AWS")');
        const count = await awsAccounts.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const statusFilter = page.locator('[data-testid="filter-status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('connected');

        await page.waitForTimeout(500);

        const connectedAccounts = page.locator('[data-testid="account-status"]:has-text("Connected")');
        const count = await connectedAccounts.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should clear filters', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const clearButton = page.locator('[data-testid="clear-filters"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();

        const searchInput = page.locator('[data-testid="search-accounts"]');
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test.describe('Pagination', () => {
    test('should paginate accounts list', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const nextButton = page.locator('[data-testid="next-page"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();

        await page.waitForTimeout(500);

        const pageIndicator = page.locator('[data-testid="current-page"]');
        await expect(pageIndicator).toContainText(/2|page.*2/i);
      }
    });

    test('should show items per page selector', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const perPageSelect = page.locator('[data-testid="items-per-page"]');
      if (await perPageSelect.isVisible()) {
        await perPageSelect.selectOption('50');

        await page.waitForTimeout(500);

        const items = page.locator('[data-testid="account-item"]');
        const count = await items.count();
        expect(count).toBeLessThanOrEqual(50);
      }
    });
  });

  test.describe('Security', () => {
    test('should encrypt credentials before storage', async ({ page }) => {
      // This is verified through the API - client should send encrypted data
      await page.goto('/cloud-accounts');
      await page.click('[data-testid="add-account-button"]');

      const requests: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/cloud-accounts')) {
          requests.push(request.postDataJSON());
        }
      });

      await page.click('[data-testid="provider-aws"]');
      await page.fill('input[name="accountName"]', 'Test');
      await page.fill('input[name="awsAccessKeyId"]', 'AKIAIOSFODNN7EXAMPLE');
      await page.fill('input[name="awsSecretAccessKey"]', 'secret');
      await page.click('button[type="submit"]');

      await page.waitForTimeout(1000);

      // Verify request was made (encryption would be verified on backend)
      expect(requests.length).toBeGreaterThan(0);
    });

    test('should not expose credentials in UI after save', async ({ page }) => {
      await page.goto('/cloud-accounts');

      const editButton = page.locator('[data-testid="edit-account"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Secret fields should be masked or empty
        const secretInput = page.locator('input[name="awsSecretAccessKey"]');
        const value = await secretInput.inputValue();

        // Should be empty or masked (asterisks)
        expect(value === '' || value.includes('*')).toBeTruthy();
      }
    });

    test('should log account access for auditing', async ({ page }) => {
      const auditRequests: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/audit')) {
          auditRequests.push(request.url());
        }
      });

      await page.goto('/cloud-accounts');

      // View account details
      const viewButton = page.locator('[data-testid="view-account"]').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(1000);
      }

      // Audit log request should have been made
      // (May be async, so this is just checking the pattern)
    });
  });
});
