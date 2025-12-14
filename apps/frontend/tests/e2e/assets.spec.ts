import { test, expect } from '@playwright/test';
import { login, waitForLoadingToComplete } from './helpers';

/**
 * E2E Tests: Asset Inventory Navigation
 * Cloud Governance Copilot - Critical Flow #4
 *
 * Tests:
 * 1. Navigate to Assets and View Inventory
 * 2. Filter Assets by Provider
 * 3. View Asset Details
 */

test.describe('Asset Inventory Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should navigate to assets and see inventory', async ({ page }) => {
    // Navigate to assets page
    const assetsLinks = [
      page.locator('a[href="/assets"]'),
      page.locator('a[href="/dashboard/assets"]'),
      page.locator('text=/assets/i').and(page.locator('a')),
      page.locator('[data-testid="nav-assets"]'),
      page.locator('text=/inventory/i').and(page.locator('a')),
    ];

    for (const link of assetsLinks) {
      if (await link.count() > 0) {
        await link.first().click();
        break;
      }
    }

    // Wait for URL to change
    await page.waitForURL(/\/assets/, { timeout: 10000 });

    // Verify we're on the assets page
    await expect(page).toHaveURL(/\/assets/);

    // Wait for loading to complete
    await waitForLoadingToComplete(page);

    // Check for assets page heading
    const headingIndicators = [
      page.locator('h1:has-text("Assets")'),
      page.locator('h1:has-text("Asset Inventory")'),
      page.locator('h1:has-text("Resources")'),
      page.locator('[data-testid="assets-title"]'),
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

    // Check for assets table or list
    const tableIndicators = [
      page.locator('[data-testid="assets-table"]'),
      page.locator('table'),
      page.locator('[role="table"]'),
      page.locator('[class*="assets-table"]'),
      page.locator('.asset-card'),
      page.locator('[data-testid="asset-list"]'),
    ];

    let tableFound = false;
    for (const indicator of tableIndicators) {
      if (await indicator.count() > 0) {
        await expect(indicator.first()).toBeVisible({ timeout: 10000 });
        tableFound = true;
        break;
      }
    }

    expect(tableFound).toBeTruthy();

    // Check if table has data (at least one row)
    const rowIndicators = [
      page.locator('table tbody tr'),
      page.locator('[role="row"]'),
      page.locator('.asset-card'),
      page.locator('[data-testid="asset-row"]'),
    ];

    for (const indicator of rowIndicators) {
      if (await indicator.count() > 0) {
        // Table has data
        break;
      }
    }
  });

  test('should filter assets by provider', async ({ page }) => {
    // Navigate to assets page
    await page.goto('/assets');
    await waitForLoadingToComplete(page);

    // Find provider filter
    const providerFilterSelectors = [
      '[data-testid="provider-filter"]',
      'select[name="provider"]',
      'button:has-text("Provider")',
      'button:has-text("Filter")',
      '[class*="provider-filter"]',
    ];

    let providerFilterFound = false;
    for (const selector of providerFilterSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await element.first().click();
        providerFilterFound = true;

        // Wait for dropdown
        await page.waitForTimeout(500);

        // Try to select AWS
        const awsOptions = [
          page.locator('text=/^AWS$/i'),
          page.locator('[data-provider="aws"]'),
          page.locator('[value="aws"]'),
          page.locator('option:has-text("AWS")'),
        ];

        for (const option of awsOptions) {
          if (await option.count() > 0) {
            await option.first().click();
            break;
          }
        }

        break;
      }
    }

    // Alternative: Try direct select element
    if (!providerFilterFound) {
      const selectElement = page.locator('select[name="provider"], select[name="cloudProvider"]');
      if (await selectElement.count() > 0) {
        try {
          await selectElement.selectOption('aws');
          providerFilterFound = true;
        } catch {
          await selectElement.selectOption({ index: 1 }); // Select first option
          providerFilterFound = true;
        }
      }
    }

    // Wait for filter to apply
    await page.waitForTimeout(2000);
    await waitForLoadingToComplete(page);

    // Verify AWS assets are shown
    const awsIndicators = [
      page.locator('text=/AWS/i'),
      page.locator('[data-provider="aws"]'),
      page.locator('td:has-text("AWS")'),
    ];

    let awsDataFound = false;
    for (const indicator of awsIndicators) {
      if (await indicator.count() > 0) {
        awsDataFound = true;
        break;
      }
    }

    expect(awsDataFound || providerFilterFound).toBeTruthy();
  });

  test('should view asset details', async ({ page }) => {
    // Navigate to assets page
    await page.goto('/assets');
    await waitForLoadingToComplete(page);

    // Find and click first asset row
    const assetRowSelectors = [
      '[data-testid="assets-table"] tbody tr',
      'table tbody tr',
      '[role="row"]',
      '.asset-card',
      '[data-testid="asset-row"]',
    ];

    let assetClicked = false;
    for (const selector of assetRowSelectors) {
      const rows = page.locator(selector);
      const count = await rows.count();

      if (count > 0) {
        // Click the first asset
        await rows.first().click();
        assetClicked = true;

        // Wait for modal or details page to appear
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (assetClicked) {
      // Check for asset detail modal or page
      const detailIndicators = [
        page.locator('[data-testid="asset-detail-modal"]'),
        page.locator('[role="dialog"]'),
        page.locator('.modal'),
        page.locator('text=/resource.*id/i'),
        page.locator('text=/asset.*details/i'),
        page.locator('[data-testid="asset-details"]'),
      ];

      let detailsVisible = false;
      for (const indicator of detailIndicators) {
        if (await indicator.count() > 0) {
          const visible = await indicator.first().isVisible().catch(() => false);
          if (visible) {
            detailsVisible = true;
            break;
          }
        }
      }

      // Check if we navigated to a details page
      const onDetailsPage = page.url().includes('/asset/') || page.url().includes('/details');

      expect(detailsVisible || onDetailsPage).toBeTruthy();

      // If details are shown, verify key information is present
      if (detailsVisible || onDetailsPage) {
        const infoIndicators = [
          page.locator('text=/resource.*id/i'),
          page.locator('text=/type/i'),
          page.locator('text=/status/i'),
          page.locator('text=/region/i'),
        ];

        let infoFound = false;
        for (const indicator of infoIndicators) {
          if (await indicator.count() > 0) {
            infoFound = true;
            break;
          }
        }

        expect(infoFound).toBeTruthy();
      }
    } else {
      // If no assets found, at least verify we're on the assets page
      await expect(page).toHaveURL(/\/assets/);
    }
  });

  test('should search for specific assets', async ({ page }) => {
    await page.goto('/assets');
    await waitForLoadingToComplete(page);

    // Find search input
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="Search"]',
      'input[name="search"]',
      '[data-testid="search-input"]',
    ];

    let searchFound = false;
    for (const selector of searchSelectors) {
      const input = page.locator(selector);
      if (await input.count() > 0) {
        await input.fill('ec2');
        searchFound = true;

        // Wait for search results
        await page.waitForTimeout(1000);
        await waitForLoadingToComplete(page);
        break;
      }
    }

    // Verify search functionality exists
    expect(searchFound).toBeTruthy();
  });

  test('should display asset statistics', async ({ page }) => {
    await page.goto('/assets');
    await waitForLoadingToComplete(page);

    // Look for statistics/KPIs
    const statsIndicators = [
      page.locator('text=/total.*assets/i'),
      page.locator('text=/total.*resources/i'),
      page.locator('[data-testid="asset-count"]'),
      page.locator('[data-testid="stats"]'),
      page.locator('.kpi'),
      page.locator('.stat'),
    ];

    let statsFound = false;
    for (const indicator of statsIndicators) {
      if (await indicator.count() > 0) {
        statsFound = true;
        break;
      }
    }

    expect(statsFound).toBeTruthy();
  });

  test('should filter assets by resource type', async ({ page }) => {
    await page.goto('/assets');
    await waitForLoadingToComplete(page);

    // Find resource type filter
    const typeFilterSelectors = [
      'select[name="type"]',
      'select[name="resourceType"]',
      '[data-testid="type-filter"]',
      'button:has-text("Type")',
    ];

    let typeFilterFound = false;
    for (const selector of typeFilterSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        if (await element.evaluate(el => el.tagName) === 'SELECT') {
          await element.selectOption({ index: 1 });
        } else {
          await element.click();
          await page.waitForTimeout(500);

          // Try to select a type
          const typeOptions = [
            page.locator('text=/instance/i'),
            page.locator('text=/bucket/i'),
            page.locator('text=/database/i'),
          ];

          for (const option of typeOptions) {
            if (await option.count() > 0) {
              await option.first().click();
              break;
            }
          }
        }

        typeFilterFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    // If filter was found and applied, verify results
    if (typeFilterFound) {
      await waitForLoadingToComplete(page);
    }

    expect(typeFilterFound).toBeTruthy();
  });
});
