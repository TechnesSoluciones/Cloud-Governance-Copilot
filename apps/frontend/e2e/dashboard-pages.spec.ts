import { test, expect } from '@playwright/test';

const BASE_URL = 'http://91.98.42.19';
const pages = [
  { name: 'Costs', path: '/costs' },
  { name: 'Security', path: '/security' },
  { name: 'Resources', path: '/resources' },
  { name: 'Incidents', path: '/incidents' },
  { name: 'Assets', path: '/assets' }
];

test.describe('Dashboard Pages Error Detection', () => {
  for (const page of pages) {
    test(`${page.name} page - capture errors`, async ({ page: browserPage }) => {
      const consoleErrors: string[] = [];
      const networkErrors: { url: string; status: number }[] = [];

      // Capture console errors
      browserPage.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Capture network errors
      browserPage.on('response', response => {
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            status: response.status()
          });
        }
      });

      // Navigate to the page
      await browserPage.goto(`${BASE_URL}${page.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait a bit for any async errors
      await browserPage.waitForTimeout(3000);

      // Take screenshot
      const fileName = page.name.toLowerCase();
      await browserPage.screenshot({
        path: `/tmp/screenshot-${fileName}.png`,
        fullPage: true
      });

      // Check for error boundaries or error messages
      const errorBoundary = await browserPage.locator('text=/something went wrong/i').count();
      const hasErrorMessage = await browserPage.locator('text=/error/i').count();

      console.log(`\n=== ${page.name} Page ===`);
      console.log('Console Errors:', consoleErrors.length);
      consoleErrors.forEach(err => console.log('  -', err.substring(0, 200)));

      console.log('Network Errors:', networkErrors.length);
      networkErrors.forEach(err => console.log('  -', err.url, '→', err.status));

      console.log('Error Boundary:', errorBoundary > 0);
      console.log('Has Error Message:', hasErrorMessage > 0);
    });
  }
});
