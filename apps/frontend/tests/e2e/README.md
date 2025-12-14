# E2E Tests - Cloud Governance Copilot

## Overview

This directory contains end-to-end (E2E) tests for the Cloud Governance Copilot application using Playwright.

## Test Coverage

### Critical Flows (6 flows, 23+ tests total)

1. **Authentication Flows** (`auth.spec.ts`) - 6 tests
   - User registration
   - User login
   - Invalid credentials handling
   - User logout
   - Protected routes access control
   - Password validation

2. **Cloud Account Connection** (`cloud-account.spec.ts`) - 4 tests
   - Connect AWS account
   - Connect Azure account
   - Validation for invalid credentials
   - Display connected accounts list

3. **Cost Dashboard** (`cost-dashboard.spec.ts`) - 5 tests
   - Navigate and view cost data
   - Filter by date range
   - Filter by service
   - Display cost breakdown by provider
   - Show cost trends

4. **Asset Inventory** (`assets.spec.ts`) - 6 tests
   - Navigate and view asset inventory
   - Filter by provider
   - View asset details
   - Search for assets
   - Display statistics
   - Filter by resource type

5. **Security Findings** (`security.spec.ts`) - 6 tests
   - Navigate and view findings
   - Filter by severity
   - Trigger security scan
   - Resolve security findings
   - Display security metrics
   - Show severity distribution

## Prerequisites

Before running the tests, ensure:

1. **Backend is running**:
   ```bash
   cd apps/api-gateway
   npm run dev
   # Should be running on http://localhost:3010
   ```

2. **Frontend is running**:
   ```bash
   cd apps/frontend
   npm run dev
   # Should be running on http://localhost:3000
   ```

3. **Test data is seeded** (if applicable):
   - Demo user credentials: `demo@example.com` / `Demo123!@#`
   - At least one cloud account connected
   - Some cost and security data available

## Running Tests

### Run all E2E tests
```bash
cd apps/frontend
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should login existing user"
```

### View test report
```bash
npm run test:e2e:report
```

## Test Configuration

Configuration is in `/apps/frontend/playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Trace**: Captured on first retry

## Test Structure

Each test file follows this structure:

```typescript
import { test, expect } from '@playwright/test';
import { login, waitForLoadingToComplete } from './helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await login(page);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Helper Functions

The `helpers.ts` file provides utility functions:

- `login(page, credentials)` - Login helper
- `logout(page)` - Logout helper
- `waitForLoadingToComplete(page)` - Wait for loading indicators
- `waitForToast(page, message)` - Wait for toast notifications
- `generateTestEmail()` - Generate unique test emails
- `generateTestName()` - Generate unique test names
- And more...

## Best Practices

1. **Always login in beforeEach** for authenticated tests
2. **Use data-testid attributes** for stable selectors
3. **Wait for loading states** before assertions
4. **Use unique test data** to avoid conflicts
5. **Clean up after tests** if creating data
6. **Use page object pattern** for complex pages
7. **Take screenshots** on failure for debugging

## Debugging Failed Tests

1. **View test report**:
   ```bash
   npm run test:e2e:report
   ```

2. **Check screenshots** in `test-results/` directory

3. **View trace** for detailed step-by-step execution

4. **Run in headed mode** to see browser:
   ```bash
   npm run test:e2e:headed
   ```

5. **Use debug mode** to step through:
   ```bash
   npm run test:e2e:debug
   ```

## CI/CD Integration

Tests run automatically in CI pipeline:

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: |
    cd apps/frontend
    npx playwright test
```

## Troubleshooting

### Tests fail with "Timeout waiting for navigation"
- Ensure frontend and backend are both running
- Check network logs for API errors
- Increase timeout in test if needed

### Tests fail with "Element not found"
- Check if UI has changed
- Update selectors or use data-testid
- Add waitForLoadingToComplete() before assertions

### Tests are flaky
- Add explicit waits for dynamic content
- Use waitForLoadingToComplete() consistently
- Check for race conditions in async operations

### Authentication fails
- Verify test user credentials in helpers.ts
- Check if user exists in database
- Review authentication flow in app

## Test Data

Default test users defined in `helpers.ts`:

```typescript
export const TEST_USERS = {
  demo: {
    email: 'demo@example.com',
    password: 'Demo123!@#',
  },
  admin: {
    email: 'admin@cloudcopilot.com',
    password: 'Admin123!@#',
  },
};
```

## Contributing

When adding new tests:

1. Follow existing test structure
2. Add descriptive test names
3. Use helper functions for common operations
4. Add appropriate waits for async operations
5. Update this README with new test coverage
6. Ensure tests pass locally before committing

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
