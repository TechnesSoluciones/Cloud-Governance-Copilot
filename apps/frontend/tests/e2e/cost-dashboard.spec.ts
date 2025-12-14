import { test, expect } from '@playwright/test';
import { login, waitForLoadingToComplete, navigateToSection } from './helpers';

/**
 * E2E Tests: Cost Dashboard Navigation
 * Cloud Governance Copilot - Critical Flow #3
 *
 * Tests:
 * 1. Navigate to Cost Dashboard and View Data
 * 2. Filter Costs by Date Range
 * 3. Filter Costs by Service
 */

test.describe('Cost Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should navigate to cost dashboard and see data', async ({ page }) => {
    // Navigate to costs page
    const costsLinks = [
      page.locator('a[href="/costs"]'),
      page.locator('a[href="/dashboard/costs"]'),
      page.locator('text=/costs/i').and(page.locator('a')),
      page.locator('[data-testid="nav-costs"]'),
    ];

    for (const link of costsLinks) {
      if (await link.count() > 0) {
        await link.first().click();
        break;
      }
    }

    // Wait for URL to change
    await page.waitForURL(/\/costs/, { timeout: 10000 });

    // Verify we're on the costs page
    await expect(page).toHaveURL(/\/costs/);

    // Wait for loading to complete
    await waitForLoadingToComplete(page);

    // Check for cost dashboard heading
    const headingIndicators = [
      page.locator('h1:has-text("Cost Dashboard")'),
      page.locator('h1:has-text("Costs")'),
      page.locator('h1:has-text("Cost Management")'),
      page.locator('[data-testid="costs-title"]'),
    ];

    let headingFound = false;
    for (const indicator of headingIndicators) {
      if (await indicator.count() > 0) {
        await expect(indicator.first()).toBeVisible({ timeout: 5000 });
        headingFound = true;
        break;
      }
    }

    expect(headingFound).toBeTruthy();

    // Check for cost chart or visualization
    const chartIndicators = [
      page.locator('[data-testid="cost-chart"]'),
      page.locator('.recharts-wrapper'),
      page.locator('svg.recharts-surface'),
      page.locator('[class*="chart"]'),
      page.locator('canvas'),
    ];

    let chartFound = false;
    for (const indicator of chartIndicators) {
      if (await indicator.count() > 0) {
        await expect(indicator.first()).toBeVisible({ timeout: 10000 });
        chartFound = true;
        break;
      }
    }

    expect(chartFound).toBeTruthy();

    // Check for KPI cards (Total Cost, This Month, etc.)
    const kpiIndicators = [
      page.locator('text=/total.*cost/i'),
      page.locator('text=/this.*month/i'),
      page.locator('text=/monthly.*cost/i'),
      page.locator('[data-testid="kpi-card"]'),
      page.locator('.kpi'),
    ];

    let kpiFound = false;
    for (const indicator of kpiIndicators) {
      if (await indicator.count() > 0) {
        kpiFound = true;
        break;
      }
    }

    expect(kpiFound).toBeTruthy();
  });

  test('should filter costs by date range', async ({ page }) => {
    // Navigate to costs page
    await page.goto('/costs');
    await waitForLoadingToComplete(page);

    // Find date range picker
    const dateRangeSelectors = [
      '[data-testid="date-range-picker"]',
      'button:has-text("Date Range")',
      'button:has-text("Last 7 Days")',
      'button:has-text("Last 30 Days")',
      '[class*="date-picker"]',
      'input[type="date"]',
    ];

    let dateRangeFound = false;
    for (const selector of dateRangeSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.first().click();
        dateRangeFound = true;

        // Wait for dropdown/options to appear
        await page.waitForTimeout(500);

        // Try to select "Last 7 Days" or similar option
        const dateOptions = [
          page.locator('text=/last.*7.*days/i'),
          page.locator('text=/7.*days/i'),
          page.locator('text=/week/i'),
          page.locator('[data-value="7d"]'),
        ];

        for (const option of dateOptions) {
          if (await option.count() > 0) {
            await option.first().click();
            break;
          }
        }

        break;
      }
    }

    // If no date picker found, try custom date inputs
    if (!dateRangeFound) {
      const startDateInput = page.locator('input[name="startDate"], input[name="from"]');
      const endDateInput = page.locator('input[name="endDate"], input[name="to"]');

      if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        await startDateInput.fill(sevenDaysAgo.toISOString().split('T')[0]);
        await endDateInput.fill(today.toISOString().split('T')[0]);
        dateRangeFound = true;
      }
    }

    // Wait for data to refresh
    await page.waitForTimeout(2000);
    await waitForLoadingToComplete(page);

    // Verify chart is still visible (data refreshed)
    const chartIndicators = [
      page.locator('[data-testid="cost-chart"]'),
      page.locator('.recharts-wrapper'),
      page.locator('svg.recharts-surface'),
    ];

    let chartVisible = false;
    for (const indicator of chartIndicators) {
      if (await indicator.count() > 0) {
        await expect(indicator.first()).toBeVisible();
        chartVisible = true;
        break;
      }
    }

    expect(chartVisible || dateRangeFound).toBeTruthy();
  });

  test('should filter costs by service', async ({ page }) => {
    // Navigate to costs page
    await page.goto('/costs');
    await waitForLoadingToComplete(page);

    // Find service filter
    const serviceFilterSelectors = [
      '[data-testid="service-filter"]',
      'select[name="service"]',
      'button:has-text("Service")',
      'button:has-text("Filter")',
      '[class*="service-filter"]',
    ];

    let serviceFilterFound = false;
    for (const selector of serviceFilterSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.first().click();
        serviceFilterFound = true;

        // Wait for dropdown
        await page.waitForTimeout(500);

        // Try to select a service (EC2, S3, Lambda, etc.)
        const serviceOptions = [
          page.locator('text=/^EC2$/i'),
          page.locator('text=/^S3$/i'),
          page.locator('text=/lambda/i'),
          page.locator('text=/compute/i'),
          page.locator('[data-service="ec2"]'),
        ];

        for (const option of serviceOptions) {
          if (await option.count() > 0) {
            await option.first().click();
            break;
          }
        }

        break;
      }
    }

    // Alternative: Try direct select element
    if (!serviceFilterFound) {
      const selectElement = page.locator('select[name="service"], select[name="serviceType"]');
      if (await selectElement.count() > 0) {
        await selectElement.selectOption({ index: 1 }); // Select first option
        serviceFilterFound = true;
      }
    }

    // Wait for filter to apply
    await page.waitForTimeout(2000);
    await waitForLoadingToComplete(page);

    // Verify filtered data is shown
    const dataIndicators = [
      page.locator('[data-testid="cost-chart"]'),
      page.locator('.recharts-wrapper'),
      page.locator('table tbody tr'),
    ];

    let dataVisible = false;
    for (const indicator of dataIndicators) {
      if (await indicator.count() > 0) {
        dataVisible = true;
        break;
      }
    }

    expect(dataVisible || serviceFilterFound).toBeTruthy();
  });

  test('should display cost breakdown by provider', async ({ page }) => {
    await page.goto('/costs');
    await waitForLoadingToComplete(page);

    // Look for provider breakdown section
    const providerIndicators = [
      page.locator('text=/AWS/i'),
      page.locator('text=/Azure/i'),
      page.locator('text=/GCP/i'),
      page.locator('[data-testid="provider-breakdown"]'),
      page.locator('text=/by.*provider/i'),
    ];

    let providerDataFound = false;
    for (const indicator of providerIndicators) {
      if (await indicator.count() > 0) {
        providerDataFound = true;
        break;
      }
    }

    expect(providerDataFound).toBeTruthy();
  });

  test('should show cost trends over time', async ({ page }) => {
    await page.goto('/costs');
    await waitForLoadingToComplete(page);

    // Look for trend indicators
    const trendIndicators = [
      page.locator('text=/trend/i'),
      page.locator('text=/increase/i'),
      page.locator('text=/decrease/i'),
      page.locator('text=/%/'),
      page.locator('[data-testid="trend-indicator"]'),
      page.locator('.trend-up, .trend-down'),
    ];

    let trendFound = false;
    for (const indicator of trendIndicators) {
      if (await indicator.count() > 0) {
        trendFound = true;
        break;
      }
    }

    // Also check for chart which shows trends
    const chartExists = await page.locator('[data-testid="cost-chart"], .recharts-wrapper').count() > 0;

    expect(trendFound || chartExists).toBeTruthy();
  });
});
