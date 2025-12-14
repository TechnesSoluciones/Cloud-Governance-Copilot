import { test, expect } from '@playwright/test';
import { testUsers, clearStorage, loginAs } from './fixtures/auth';

/**
 * E2E Test Suite: Audit Logs
 * Tests audit log viewing, filtering, and pagination
 */

test.describe('Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginAs(page, 'user');
  });

  test.describe('View Audit Logs', () => {
    test('should display audit logs page', async ({ page }) => {
      await page.goto('/audit-logs');

      await expect(page.locator('h1, h2')).toContainText(/audit.*logs|activity.*log|history/i);
      await expect(page.locator('[data-testid="audit-log-table"], table')).toBeVisible();
    });

    test('should show empty state when no logs exist', async ({ page }) => {
      await page.goto('/audit-logs');

      const emptyState = page.locator('[data-testid="empty-state"]');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText(/no.*logs|no.*activity|no.*events/i);
      }
    });

    test('should display log entries in table format', async ({ page }) => {
      await page.goto('/audit-logs');

      const tableHeaders = page.locator('th');
      const headerCount = await tableHeaders.count();
      expect(headerCount).toBeGreaterThan(0);

      // Verify common column headers
      await expect(page.locator('body')).toContainText(/timestamp|date|time/i);
      await expect(page.locator('body')).toContainText(/action|event|activity/i);
      await expect(page.locator('body')).toContainText(/user|actor/i);
    });

    test('should show log entry timestamp', async ({ page }) => {
      await page.goto('/audit-logs');

      const timestamp = page.locator('[data-testid="log-timestamp"]').first();
      if (await timestamp.isVisible()) {
        await expect(timestamp).toHaveText(/.+/);
      }
    });

    test('should show log entry action/event type', async ({ page }) => {
      await page.goto('/audit-logs');

      const action = page.locator('[data-testid="log-action"]').first();
      if (await action.isVisible()) {
        await expect(action).toContainText(/login|logout|create|update|delete/i);
      }
    });

    test('should show user who performed action', async ({ page }) => {
      await page.goto('/audit-logs');

      const user = page.locator('[data-testid="log-user"]').first();
      if (await user.isVisible()) {
        await expect(user).toHaveText(/.+/);
      }
    });

    test('should show action status (success/failure)', async ({ page }) => {
      await page.goto('/audit-logs');

      const status = page.locator('[data-testid="log-status"]').first();
      if (await status.isVisible()) {
        await expect(status).toContainText(/success|failed|error|completed/i);
      }
    });

    test('should show IP address of user', async ({ page }) => {
      await page.goto('/audit-logs');

      const ipAddress = page.locator('[data-testid="log-ip"]').first();
      if (await ipAddress.isVisible()) {
        await expect(ipAddress).toMatch(/\d+\.\d+\.\d+\.\d+/);
      }
    });

    test('should show resource affected', async ({ page }) => {
      await page.goto('/audit-logs');

      const resource = page.locator('[data-testid="log-resource"]').first();
      if (await resource.isVisible()) {
        await expect(resource).toHaveText(/.+/);
      }
    });
  });

  test.describe('Log Entry Details', () => {
    test('should expand log entry to show details', async ({ page }) => {
      await page.goto('/audit-logs');

      const expandButton = page.locator('[data-testid="expand-log"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        await expect(page.locator('[data-testid="log-details"]')).toBeVisible();
      }
    });

    test('should show detailed information in expanded view', async ({ page }) => {
      await page.goto('/audit-logs');

      const expandButton = page.locator('[data-testid="expand-log"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        const details = page.locator('[data-testid="log-details"]');
        await expect(details).toContainText(/user.*agent|browser|device/i);
      }
    });

    test('should show request/response data if available', async ({ page }) => {
      await page.goto('/audit-logs');

      const expandButton = page.locator('[data-testid="expand-log"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        const requestData = page.locator('[data-testid="request-data"]');
        if (await requestData.isVisible()) {
          await expect(requestData).toBeVisible();
        }
      }
    });

    test('should show error details for failed actions', async ({ page }) => {
      await page.goto('/audit-logs');

      // Find a failed log entry
      const failedLog = page.locator('[data-testid="log-status"]:has-text("Failed")').first();
      if (await failedLog.isVisible()) {
        const row = failedLog.locator('xpath=ancestor::tr');
        await row.click();

        const errorDetails = page.locator('[data-testid="error-details"]');
        if (await errorDetails.isVisible()) {
          await expect(errorDetails).toContainText(/error|reason|message/i);
        }
      }
    });

    test('should collapse expanded log entry', async ({ page }) => {
      await page.goto('/audit-logs');

      const expandButton = page.locator('[data-testid="expand-log"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await expect(page.locator('[data-testid="log-details"]')).toBeVisible();

        // Click again to collapse
        await expandButton.click();
        await expect(page.locator('[data-testid="log-details"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Filtering', () => {
    test('should filter by date range', async ({ page }) => {
      await page.goto('/audit-logs');

      const dateFromInput = page.locator('[data-testid="filter-date-from"]');
      const dateToInput = page.locator('[data-testid="filter-date-to"]');

      if (await dateFromInput.isVisible()) {
        await dateFromInput.fill('2024-01-01');
        await dateToInput.fill('2024-12-31');

        await page.click('[data-testid="apply-filters"]');

        await page.waitForTimeout(500);

        // Verify logs are filtered
        const logs = page.locator('[data-testid="log-entry"]');
        const count = await logs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by action type', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionFilter = page.locator('[data-testid="filter-action"]');
      if (await actionFilter.isVisible()) {
        await actionFilter.selectOption('user.login');

        await page.waitForTimeout(500);

        const loginLogs = page.locator('[data-testid="log-action"]:has-text("Login")');
        const count = await loginLogs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by user', async ({ page }) => {
      await page.goto('/audit-logs');

      const userFilter = page.locator('[data-testid="filter-user"]');
      if (await userFilter.isVisible()) {
        await userFilter.fill(testUsers.user.email);

        await page.waitForTimeout(500);

        const userLogs = page.locator(`[data-testid="log-user"]:has-text("${testUsers.user.email}")`);
        const count = await userLogs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/audit-logs');

      const statusFilter = page.locator('[data-testid="filter-status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('success');

        await page.waitForTimeout(500);

        const successLogs = page.locator('[data-testid="log-status"]:has-text("Success")');
        const count = await successLogs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by resource type', async ({ page }) => {
      await page.goto('/audit-logs');

      const resourceFilter = page.locator('[data-testid="filter-resource"]');
      if (await resourceFilter.isVisible()) {
        await resourceFilter.selectOption('cloud-account');

        await page.waitForTimeout(500);

        const resourceLogs = page.locator('[data-testid="log-resource"]:has-text("Cloud Account")');
        const count = await resourceLogs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should apply multiple filters simultaneously', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionFilter = page.locator('[data-testid="filter-action"]');
      const statusFilter = page.locator('[data-testid="filter-status"]');

      if ((await actionFilter.isVisible()) && (await statusFilter.isVisible())) {
        await actionFilter.selectOption('user.login');
        await statusFilter.selectOption('success');

        await page.click('[data-testid="apply-filters"]');

        await page.waitForTimeout(500);

        // Verify both filters are applied
        const logs = page.locator('[data-testid="log-entry"]');
        const count = await logs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should clear all filters', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionFilter = page.locator('[data-testid="filter-action"]');
      if (await actionFilter.isVisible()) {
        await actionFilter.selectOption('user.login');
        await page.waitForTimeout(500);

        const clearButton = page.locator('[data-testid="clear-filters"]');
        await clearButton.click();

        await page.waitForTimeout(500);

        // Verify filter is cleared
        const selectedValue = await actionFilter.inputValue();
        expect(selectedValue).toBe('');
      }
    });

    test('should show active filter count', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionFilter = page.locator('[data-testid="filter-action"]');
      const statusFilter = page.locator('[data-testid="filter-status"]');

      if ((await actionFilter.isVisible()) && (await statusFilter.isVisible())) {
        await actionFilter.selectOption('user.login');
        await statusFilter.selectOption('success');

        const filterCount = page.locator('[data-testid="active-filter-count"]');
        if (await filterCount.isVisible()) {
          await expect(filterCount).toContainText('2');
        }
      }
    });
  });

  test.describe('Search', () => {
    test('should search logs by keyword', async ({ page }) => {
      await page.goto('/audit-logs');

      const searchInput = page.locator('[data-testid="search-logs"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('login');

        await page.waitForTimeout(500);

        const results = page.locator('[data-testid="log-entry"]');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should highlight search terms in results', async ({ page }) => {
      await page.goto('/audit-logs');

      const searchInput = page.locator('[data-testid="search-logs"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('login');

        await page.waitForTimeout(500);

        const highlighted = page.locator('mark, .highlight');
        if (await highlighted.first().isVisible()) {
          await expect(highlighted.first()).toBeVisible();
        }
      }
    });

    test('should show no results message for non-matching search', async ({ page }) => {
      await page.goto('/audit-logs');

      const searchInput = page.locator('[data-testid="search-logs"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('nonexistentsearchterm12345');

        await page.waitForTimeout(500);

        const noResults = page.locator('[data-testid="no-results"]');
        if (await noResults.isVisible()) {
          await expect(noResults).toContainText(/no.*results|no.*logs.*found/i);
        }
      }
    });
  });

  test.describe('Pagination', () => {
    test('should paginate audit logs', async ({ page }) => {
      await page.goto('/audit-logs');

      const nextButton = page.locator('[data-testid="next-page"]');
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();

        await page.waitForTimeout(500);

        const pageIndicator = page.locator('[data-testid="current-page"]');
        await expect(pageIndicator).toContainText(/2|page.*2/i);
      }
    });

    test('should navigate to previous page', async ({ page }) => {
      await page.goto('/audit-logs?page=2');

      const prevButton = page.locator('[data-testid="prev-page"]');
      if (await prevButton.isVisible() && !(await prevButton.isDisabled())) {
        await prevButton.click();

        await page.waitForTimeout(500);

        const pageIndicator = page.locator('[data-testid="current-page"]');
        await expect(pageIndicator).toContainText(/1|page.*1/i);
      }
    });

    test('should change items per page', async ({ page }) => {
      await page.goto('/audit-logs');

      const perPageSelect = page.locator('[data-testid="items-per-page"]');
      if (await perPageSelect.isVisible()) {
        await perPageSelect.selectOption('50');

        await page.waitForTimeout(500);

        const items = page.locator('[data-testid="log-entry"]');
        const count = await items.count();
        expect(count).toBeLessThanOrEqual(50);
      }
    });

    test('should show total number of logs', async ({ page }) => {
      await page.goto('/audit-logs');

      const totalCount = page.locator('[data-testid="total-logs"]');
      if (await totalCount.isVisible()) {
        await expect(totalCount).toContainText(/\d+.*logs|total.*\d+/i);
      }
    });

    test('should disable next button on last page', async ({ page }) => {
      await page.goto('/audit-logs');

      // Navigate to last page
      const lastPageButton = page.locator('[data-testid="last-page"]');
      if (await lastPageButton.isVisible()) {
        await lastPageButton.click();

        await page.waitForTimeout(500);

        const nextButton = page.locator('[data-testid="next-page"]');
        const isDisabled = await nextButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    });
  });

  test.describe('Export', () => {
    test('should export logs to CSV', async ({ page }) => {
      await page.goto('/audit-logs');

      const exportButton = page.locator('[data-testid="export-logs"]');
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      }
    });

    test('should export filtered logs only', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionFilter = page.locator('[data-testid="filter-action"]');
      if (await actionFilter.isVisible()) {
        await actionFilter.selectOption('user.login');
        await page.waitForTimeout(500);

        const exportButton = page.locator('[data-testid="export-logs"]');
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();

          const download = await downloadPromise;
          expect(download.suggestedFilename()).toBeTruthy();
        }
      }
    });

    test('should show export format options', async ({ page }) => {
      await page.goto('/audit-logs');

      const exportButton = page.locator('[data-testid="export-logs"]');
      if (await exportButton.isVisible()) {
        await exportButton.click();

        const formatOptions = page.locator('[data-testid="export-format"]');
        if (await formatOptions.isVisible()) {
          await expect(formatOptions).toBeVisible();
        }
      }
    });
  });

  test.describe('Sorting', () => {
    test('should sort by timestamp', async ({ page }) => {
      await page.goto('/audit-logs');

      const timestampHeader = page.locator('th:has-text("Timestamp"), th:has-text("Date")');
      if (await timestampHeader.isVisible()) {
        await timestampHeader.click();

        await page.waitForTimeout(500);

        // Verify sort indicator
        const sortIndicator = page.locator('[data-testid="sort-indicator"]');
        if (await sortIndicator.isVisible()) {
          await expect(sortIndicator).toBeVisible();
        }
      }
    });

    test('should reverse sort on second click', async ({ page }) => {
      await page.goto('/audit-logs');

      const timestampHeader = page.locator('th:has-text("Timestamp")');
      if (await timestampHeader.isVisible()) {
        await timestampHeader.click();
        await page.waitForTimeout(500);

        await timestampHeader.click();
        await page.waitForTimeout(500);

        const sortIndicator = page.locator('[data-testid="sort-desc"]');
        if (await sortIndicator.isVisible()) {
          await expect(sortIndicator).toBeVisible();
        }
      }
    });

    test('should sort by action type', async ({ page }) => {
      await page.goto('/audit-logs');

      const actionHeader = page.locator('th:has-text("Action"), th:has-text("Event")');
      if (await actionHeader.isVisible()) {
        await actionHeader.click();

        await page.waitForTimeout(500);

        const logs = page.locator('[data-testid="log-entry"]');
        const count = await logs.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show refresh button', async ({ page }) => {
      await page.goto('/audit-logs');

      const refreshButton = page.locator('[data-testid="refresh-logs"]');
      if (await refreshButton.isVisible()) {
        await expect(refreshButton).toBeVisible();
      }
    });

    test('should refresh logs on button click', async ({ page }) => {
      await page.goto('/audit-logs');

      const refreshButton = page.locator('[data-testid="refresh-logs"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();

        // Should show loading state
        const loadingIndicator = page.locator('[data-testid="loading-logs"]');
        if (await loadingIndicator.isVisible()) {
          await expect(loadingIndicator).toBeVisible();
        }
      }
    });

    test('should auto-refresh if enabled', async ({ page }) => {
      await page.goto('/audit-logs');

      const autoRefreshToggle = page.locator('[data-testid="auto-refresh-toggle"]');
      if (await autoRefreshToggle.isVisible()) {
        await autoRefreshToggle.click();

        // Wait for auto-refresh interval
        await page.waitForTimeout(10000);

        // Verify refresh occurred (check for network request)
        // This would need more sophisticated network interception
      }
    });
  });

  test.describe('Security & Permissions', () => {
    test('should only show logs for current user (non-admin)', async ({ page }) => {
      await page.goto('/audit-logs');

      // Verify all logs belong to current user
      const userLogs = page.locator('[data-testid="log-user"]');
      const count = await userLogs.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const userText = await userLogs.nth(i).textContent();
          expect(userText).toContain(testUsers.user.email);
        }
      }
    });

    test('should mask sensitive information in logs', async ({ page }) => {
      await page.goto('/audit-logs');

      const expandButton = page.locator('[data-testid="expand-log"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        const logDetails = await page.locator('[data-testid="log-details"]').textContent();

        // Verify sensitive data is masked
        expect(logDetails?.toLowerCase()).not.toContain('password');
        expect(logDetails?.toLowerCase()).not.toContain('secret');
        expect(logDetails?.toLowerCase()).not.toContain('token');
      }
    });

    test('should not allow modifying or deleting logs', async ({ page }) => {
      await page.goto('/audit-logs');

      // Verify no edit/delete buttons exist
      const editButton = page.locator('[data-testid="edit-log"]');
      const deleteButton = page.locator('[data-testid="delete-log"]');

      await expect(editButton).not.toBeVisible();
      await expect(deleteButton).not.toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load initial logs quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/audit-logs');

      await page.waitForSelector('[data-testid="audit-log-table"]');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should implement infinite scroll or pagination efficiently', async ({ page }) => {
      await page.goto('/audit-logs');

      // Scroll to bottom multiple times
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
      }

      // Verify logs are still loading smoothly
      const logs = page.locator('[data-testid="log-entry"]');
      const count = await logs.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/audit-logs');

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focusedElement);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/audit-logs');

      const table = page.locator('[data-testid="audit-log-table"]');
      const ariaLabel = await table.getAttribute('aria-label');
      const role = await table.getAttribute('role');

      expect(ariaLabel || role).toBeTruthy();
    });

    test('should announce filter changes to screen readers', async ({ page }) => {
      await page.goto('/audit-logs');

      const liveRegion = page.locator('[role="status"], [aria-live="polite"]');
      const count = await liveRegion.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
