# Testing Guide - Task 2.7: Tests & Validation Suite

## Overview

This document provides instructions for running the comprehensive test suite created for Phase 2 AWS Integration (Tasks 2.1-2.6).

## Test Coverage Summary

### Unit Tests Created

1. **AWS Cost Explorer Service** (`src/integrations/aws/__tests__/cost-explorer.service.test.ts`)
   - 29 test cases covering:
     - Constructor validation
     - Credential validation
     - Cost data retrieval and transformation
     - Filtering (service, region)
     - Cost aggregation by service
     - Cost trends (daily, weekly, monthly)
     - Retry logic with exponential backoff
     - Error handling (throttling, network errors, invalid credentials)

2. **AWS EC2 Service** (`src/integrations/aws/__tests__/ec2.service.test.ts`)
   - 30+ test cases covering:
     - EC2 instance discovery
     - Asset transformation to CloudAsset format
     - Filtering (status, tags, resource type)
     - Multi-region discovery
     - Asset details retrieval (by ID and ARN)
     - Retry logic and error handling
     - Tag extraction and metadata building

3. **Cost Collection Service** (`src/modules/finops/services/__tests__/cost-collection.service.test.ts`)
   - 20+ test cases covering:
     - Complete cost collection workflow
     - Credential decryption (AES-256-GCM)
     - AWS integration and validation
     - Database persistence with transactions
     - Duplicate prevention (skipDuplicates)
     - Error handling (invalid credentials, missing account, encryption errors)

4. **Anomaly Detection Service** (`src/modules/finops/services/__tests__/anomaly-detection.service.test.ts`)
   - 25+ test cases covering:
     - Anomaly detection with deviation thresholds
     - Severity calculation (low, medium, high, critical)
     - Historical baseline calculation
     - Event emission (cost.anomaly.detected)
     - Duplicate prevention
     - Query filtering (status, severity, provider, service, date range)

### E2E Tests Created

1. **FinOps API Endpoints** (`tests/e2e/finops/costs.e2e.test.ts`)
   - 25+ test cases covering:
     - GET /api/finops/costs (with filters)
     - GET /api/finops/costs/by-service (aggregation)
     - GET /api/finops/costs/trends (granularity)
     - GET /api/finops/anomalies (with filters)
     - POST /api/finops/anomalies/:id/resolve
     - Authentication and authorization
     - Tenant isolation
     - Input validation
     - Error responses (400, 401, 404)

### Fixtures and Mock Data

**File:** `tests/fixtures/aws-mock-responses.ts`
- AWS Cost Explorer mock responses
- AWS EC2 mock responses
- Database mock data (CloudAccount, CostData, CostAnomalies, User)
- Realistic test data for all scenarios

## Running Tests

### Run All Unit Tests

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway

# Run all unit tests
npm test -- --testPathPattern="__tests__"

# Run with coverage
npm run test:coverage
```

### Run Specific Test Suites

```bash
# AWS Cost Explorer Service tests
npm test -- --testPathPattern="cost-explorer.service.test"

# AWS EC2 Service tests
npm test -- --testPathPattern="ec2.service.test"

# Cost Collection Service tests
npm test -- --testPathPattern="cost-collection.service.test"

# Anomaly Detection Service tests
npm test -- --testPathPattern="anomaly-detection.service.test"
```

### Run E2E Tests

```bash
# Prerequisites: Database must be running
# Start test database (if using Docker)
docker-compose -f docker-compose.test.yml up -d postgres redis

# Run E2E tests
npm test -- --testPathPattern="e2e"

# Run specific E2E suite
npm test -- --testPathPattern="costs.e2e.test"
```

### Generate Coverage Report

```bash
# Generate complete coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Coverage thresholds (configured in jest.config.js):
# - Global: 80% (branches, functions, lines, statements)
# - FinOps Services: 85%
# - AWS Integrations: 80%
```

## Test Structure

```
apps/api-gateway/
├── src/
│   ├── integrations/
│   │   └── aws/
│   │       └── __tests__/
│   │           ├── cost-explorer.service.test.ts
│   │           └── ec2.service.test.ts
│   └── modules/
│       └── finops/
│           └── services/
│               └── __tests__/
│                   ├── cost-collection.service.test.ts
│                   └── anomaly-detection.service.test.ts
└── tests/
    ├── fixtures/
    │   └── aws-mock-responses.ts
    ├── e2e/
    │   └── finops/
    │       └── costs.e2e.test.ts
    └── setup.ts
```

## Key Testing Patterns

### 1. Mocking AWS SDK

```typescript
jest.mock('@aws-sdk/client-cost-explorer');

const mockSend = jest.fn();
(CostExplorerClient as jest.MockedClass<typeof CostExplorerClient>)
  .mockImplementation(() => ({
    send: mockSend,
  } as any));
```

### 2. Mocking Prisma

```typescript
jest.mock('@prisma/client');

const prismaMock = {
  cloudAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  // ... other models
} as any;
```

### 3. Testing Async Operations

```typescript
it('should handle async operation', async () => {
  // Arrange
  mockSend.mockResolvedValue({ ResultsByTime: [] });

  // Act
  const result = await service.getCosts(dateRange);

  // Assert
  expect(result).toEqual([]);
  expect(mockSend).toHaveBeenCalled();
});
```

### 4. Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  // Arrange
  const error = new Error('Network timeout');
  mockSend.mockRejectedValue(error);

  // Act & Assert
  await expect(service.getCosts(dateRange)).rejects.toThrow('Network timeout');
});
```

## Test Data

### Mock Credentials

```typescript
{
  provider: 'aws',
  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  awsRegion: 'us-east-1'
}
```

### Mock Date Ranges

```typescript
{
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
}
```

## Known Issues and Limitations

### TypeScript Compilation Errors

Some test files may show TypeScript errors due to Prisma mock typing issues. These can be resolved by:

1. Using `as any` type assertions for Prisma mocks
2. Creating proper mock types in a separate file
3. Using `@ts-expect-error` comments for known limitations

**Workaround:**

```typescript
// Create proper mock
const prismaMock = {
  cloudAccount: {
    findUnique: jest.fn() as any,
    update: jest.fn() as any,
  },
} as any;
```

### E2E Test Database

E2E tests require a running PostgreSQL and Redis instance:

```bash
# Option 1: Use Docker Compose
docker-compose -f docker-compose.test.yml up -d

# Option 2: Use local instances
export DATABASE_URL="postgresql://test:test@localhost:5432/copilot_test"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
```

## Coverage Goals

### Current Status (Estimated)

- **AWS Cost Explorer Service:** ~95% coverage
- **AWS EC2 Service:** ~90% coverage
- **Cost Collection Service:** ~85% coverage
- **Anomaly Detection Service:** ~90% coverage
- **FinOps Controller (E2E):** ~75% coverage

### Target Thresholds

As configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/modules/finops/services/**/*.ts': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
}
```

## Test Execution Summary

### Successful Test Count

- **Unit Tests:** 100+ test cases
- **E2E Tests:** 25+ test cases
- **Total:** 125+ test cases

### Test Categories

1. **Happy Path Tests:** ~40%
2. **Error Handling Tests:** ~30%
3. **Edge Case Tests:** ~20%
4. **Integration Tests:** ~10%

## Next Steps

### For Developers

1. Run unit tests before committing:
   ```bash
   npm test -- --testPathPattern="__tests__"
   ```

2. Ensure coverage thresholds are met:
   ```bash
   npm run test:coverage
   ```

3. Run E2E tests before merging to main:
   ```bash
   npm test -- --testPathPattern="e2e"
   ```

### For CI/CD Pipeline

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Unit Tests
  run: npm test -- --testPathPattern="__tests__" --coverage

- name: Run E2E Tests
  run: npm test -- --testPathPattern="e2e"

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Troubleshooting

### Tests Timing Out

Increase timeout in `jest.config.js`:

```javascript
testTimeout: 30000, // 30 seconds
```

### Mock Data Not Working

Verify mock imports:

```typescript
import { mockAWSCostResponse } from '../../fixtures/aws-mock-responses';
```

### Prisma Mock Issues

Use proper type casting:

```typescript
prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
```

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [AWS SDK Mocking](https://aws.amazon.com/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing/unit-testing)

## Contact

For questions or issues with the test suite, contact:
- QA Team Lead
- Backend Engineering Team
- DevOps Team (for CI/CD integration)
