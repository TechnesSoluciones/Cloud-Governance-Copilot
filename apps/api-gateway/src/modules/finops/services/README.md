# FinOps Services

This directory contains the core business logic services for the FinOps (Cloud Spend Navigator) module.

## Services

### CostCollectionService

Orchestrates the cost data collection workflow from cloud providers to the database.

**Features:**
- Multi-cloud support (currently AWS, extensible to Azure/GCP)
- Secure credential decryption (AES-256-GCM)
- Automatic duplicate prevention
- Transaction-based persistence
- Comprehensive error handling and logging
- Performance metrics tracking

**Usage Example:**

```typescript
import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from './services';
import { eventBus } from '../../../shared/events/event-bus';

// Initialize dependencies
const prisma = new PrismaClient();
const costCollectionService = new CostCollectionService(prisma, eventBus);

// Collect costs for a cloud account
const result = await costCollectionService.collectCostsForAccount(
  'cloud-account-uuid-123',
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
);

// Check results
if (result.success) {
  console.log(`Successfully collected and saved ${result.recordsSaved} cost records`);
  console.log(`Execution time: ${result.executionTimeMs}ms`);
} else {
  console.error('Cost collection failed:', result.errors);
}
```

**Workflow:**

1. **Fetch Cloud Account** - Retrieves account details and encrypted credentials from database
2. **Validate Provider** - Ensures the provider is supported (currently only AWS)
3. **Decrypt Credentials** - Securely decrypts AWS access keys using AES-256-GCM
4. **Instantiate Provider Service** - Creates AWSCostExplorerService instance
5. **Validate Credentials** - Verifies AWS credentials have required permissions
6. **Fetch Cost Data** - Retrieves cost data from AWS Cost Explorer API
7. **Transform & Save** - Converts to Prisma format and saves to database
8. **Update Sync Timestamp** - Records successful sync time
9. **Return Statistics** - Returns collection metrics

**Database Schema:**

The service interacts with these tables:

- `cloud_accounts` - Stores encrypted cloud provider credentials
- `cost_data` - Stores daily cost data with unique constraint on (tenantId, cloudAccountId, date, provider, service, usageType)

**Security:**

- Credentials are encrypted at rest using AES-256-GCM
- ENCRYPTION_KEY must be set in environment variables
- Sensitive data is never logged
- Authentication tags prevent credential tampering

**Error Handling:**

The service uses comprehensive error handling:

- Returns `CollectionResult` with success status and error messages
- Logs all errors with stack traces
- Transaction rollback on database errors
- Graceful handling of invalid credentials

**Performance:**

- Uses Prisma `createMany` with `skipDuplicates` for efficient bulk inserts
- Transaction-based operations for data consistency
- Tracks execution time for monitoring
- Optimized for large cost datasets

## Environment Variables

Required environment variables:

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/copilot"

# Encryption key for credential decryption (must be 32 bytes)
ENCRYPTION_KEY="your-32-byte-encryption-key-here"
```

## Future Enhancements

- Support for Azure and GCP cost collection
- Incremental sync (only fetch new data since lastSync)
- Retry logic for transient failures
- Rate limiting for cloud provider API calls
- Cost optimization recommendations
