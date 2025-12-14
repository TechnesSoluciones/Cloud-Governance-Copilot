# Testing Guide - Cloud Governance Copilot Frontend

## Overview

This document describes the E2E testing setup for the Cloud Governance Copilot frontend application using Playwright.

## Test Structure

```
apps/frontend/
├── tests/e2e/                      # New critical flow tests (27 tests)
│   ├── auth.spec.ts                # Authentication flows (6 tests)
│   ├── cloud-account.spec.ts       # Cloud account connection (4 tests)
│   ├── cost-dashboard.spec.ts      # Cost dashboard (5 tests)
│   ├── assets.spec.ts              # Asset inventory (6 tests)
│   ├── security.spec.ts            # Security findings (6 tests)
│   ├── helpers.ts                  # Shared utilities
│   ├── README.md                   # Detailed documentation
│   └── .env.example                # Environment variables
├── e2e/                            # Existing Wave 3 tests
│   ├── auth.spec.ts
│   ├── cloud-accounts.spec.ts
│   ├── audit-logs.spec.ts
│   ├── email-verification.spec.ts
│   ├── mfa.spec.ts
│   ├── password-reset.spec.ts
│   └── user-profile.spec.ts
├── playwright.config.ts            # Main config (runs e2e/)
└── playwright.critical-flows.config.ts  # Critical flows config (runs tests/e2e/)
```

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend
npm install
```

Playwright is already installed in `package.json`.

### 2. Start Backend and Frontend

**Terminal 1 - Backend:**
```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway
npm run dev
# Should start on http://localhost:3010
```

**Terminal 2 - Frontend:**
```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend
npm run dev
# Should start on http://localhost:3000
```

### 3. Run Critical Flow Tests

**Terminal 3 - Tests:**
```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend

# Run all critical flow tests
npm run test:e2e:critical

# Run in UI mode (interactive)
npm run test:e2e:critical:ui

# Run in headed mode (see browser)
npm run test:e2e:critical:headed

# View report
npm run test:e2e:critical:report
```

## Test Coverage - 6 Critical Flows (27 Tests)

### 1. Authentication Flows (6 tests)
**File:** `tests/e2e/auth.spec.ts`

- ✅ User registration with unique credentials
- ✅ User login with existing account
- ✅ Invalid credentials error handling
- ✅ User logout
- ✅ Protected routes access control
- ✅ Password validation on registration

### 2. Cloud Account Connection (4 tests)
**File:** `tests/e2e/cloud-account.spec.ts`

- ✅ Connect AWS account
- ✅ Connect Azure account
- ✅ Validation errors for invalid credentials
- ✅ Display list of connected accounts

### 3. Cost Dashboard Navigation (5 tests)
**File:** `tests/e2e/cost-dashboard.spec.ts`

- ✅ Navigate to cost dashboard and view data
- ✅ Filter costs by date range
- ✅ Filter costs by service
- ✅ Display cost breakdown by provider
- ✅ Show cost trends over time

### 4. Asset Inventory Navigation (6 tests)
**File:** `tests/e2e/assets.spec.ts`

- ✅ Navigate to assets and view inventory
- ✅ Filter assets by provider
- ✅ View asset details
- ✅ Search for specific assets
- ✅ Display asset statistics
- ✅ Filter assets by resource type

### 5. Security Findings Navigation (6 tests)
**File:** `tests/e2e/security.spec.ts`

- ✅ Navigate to security and view findings
- ✅ Filter findings by severity
- ✅ Trigger security scan
- ✅ Resolve security finding
- ✅ Display security score/metrics
- ✅ Show severity distribution

## Available Test Commands

### Critical Flows (tests/e2e/)
```bash
# Run all critical flow tests
npm run test:e2e:critical

# Run in UI mode - interactive test runner
npm run test:e2e:critical:ui

# Run in headed mode - see browser actions
npm run test:e2e:critical:headed

# View HTML report
npm run test:e2e:critical:report

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts --config=playwright.critical-flows.config.ts

# Run specific test by name
npx playwright test --config=playwright.critical-flows.config.ts -g "should login existing user"
```

### All Tests (e2e/ directory)
```bash
# Run all tests (original Wave 3 tests)
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

## Configuration

### Critical Flows Config
**File:** `playwright.critical-flows.config.ts`

- **Test Directory:** `./tests/e2e`
- **Base URL:** `http://localhost:3000`
- **Browser:** Chromium (Chrome) only
- **Timeout:** 60 seconds per test
- **Retries:** 2 on CI, 0 locally
- **Screenshots:** On failure only
- **Videos:** On failure only
- **Trace:** On first retry

### Main Config
**File:** `playwright.config.ts`

- **Test Directory:** `./e2e`
- **Base URL:** `http://localhost:3000`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet
- **Global Setup:** `./e2e/global-setup.ts`
- **Global Teardown:** `./e2e/global-teardown.ts`

## Test Data

Default test users are configured in `tests/e2e/helpers.ts`:

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

**Important:** Ensure these users exist in your database before running tests.

## Debugging Tests

### 1. View Test Report
```bash
npm run test:e2e:critical:report
```
Opens an HTML report showing:
- Test results
- Screenshots on failure
- Videos on failure
- Trace viewer for detailed debugging

### 2. Run in Headed Mode
```bash
npm run test:e2e:critical:headed
```
See the browser as tests run.

### 3. Run in UI Mode
```bash
npm run test:e2e:critical:ui
```
Interactive test runner with:
- Step-by-step execution
- Time travel debugging
- Visual test picker

### 4. Check Test Output
Failed tests automatically capture:
- **Screenshots:** `test-results/*.png`
- **Videos:** `test-results/*.webm`
- **Traces:** `test-results/*.zip`

## Common Issues & Solutions

### Issue: "Timeout waiting for navigation"
**Solution:**
- Ensure backend is running on http://localhost:3010
- Ensure frontend is running on http://localhost:3000
- Check network tab for API errors
- Increase timeout in test if needed

### Issue: "Element not found"
**Solution:**
- UI may have changed, update selectors
- Add `data-testid` attributes to components
- Use `waitForLoadingToComplete()` before assertions

### Issue: "Authentication fails"
**Solution:**
- Verify test user exists in database
- Check credentials in `helpers.ts`
- Review backend authentication logs

### Issue: "Tests are flaky"
**Solution:**
- Add explicit waits for dynamic content
- Use `waitForLoadingToComplete()` consistently
- Check for race conditions in async operations

## Best Practices

1. **Always login in beforeEach** for authenticated tests
2. **Use data-testid attributes** for stable selectors
3. **Wait for loading states** before assertions
4. **Use unique test data** to avoid conflicts
5. **Clean up after tests** if creating data
6. **Use helper functions** from `helpers.ts`
7. **Take screenshots** on failure for debugging

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd apps/frontend
          npm install
          npx playwright install --with-deps

      - name: Start backend
        run: |
          cd apps/api-gateway
          npm install
          npm run dev &
          sleep 10

      - name: Start frontend
        run: |
          cd apps/frontend
          npm run build
          npm run start &
          sleep 10

      - name: Run critical flow tests
        run: |
          cd apps/frontend
          npm run test:e2e:critical

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/frontend/playwright-report-critical/
```

## Next Steps

1. **Add more tests** as new features are developed
2. **Implement visual regression testing** with Playwright's screenshot comparison
3. **Add API mocking** for more predictable tests
4. **Create page object models** for complex pages
5. **Add performance testing** with Playwright's performance APIs

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Examples](https://playwright.dev/docs/ci)

## Summary

**✅ 6 Critical Flows Implemented**
**✅ 27 E2E Tests Created**
**✅ Complete Test Infrastructure**
**✅ Helper Utilities**
**✅ Comprehensive Documentation**

Run `npm run test:e2e:critical` to start testing!
