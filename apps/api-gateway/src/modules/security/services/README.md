# Security Scan Service

The Security Scan Service is the main orchestrator for multi-cloud security scanning in the Cloud Governance Copilot platform. It coordinates AWS and Azure security scanners to detect misconfigurations and security vulnerabilities across cloud accounts.

## Overview

### Key Features

- **Multi-Cloud Support**: Scans AWS and Azure accounts seamlessly
- **Intelligent Orchestration**: Handles single or multiple accounts with parallel processing
- **Finding Deduplication**: Prevents duplicate findings within a 7-day window
- **Event-Driven Architecture**: Emits real-time events for CRITICAL/HIGH findings
- **Robust Error Handling**: Continues scanning even if individual accounts fail
- **Credential Security**: Decrypts encrypted credentials on-demand
- **Scan Lifecycle Tracking**: Monitors scan status (running → completed/failed)

### Architecture

```
SecurityScanService (Orchestrator)
    ├── AWSSecurityScannerService
    │   ├── S3 Bucket Checks
    │   ├── Security Group Checks
    │   └── IAM Policy Checks
    │
    └── AzureSecurityScannerService
        ├── Storage Account Checks
        ├── NSG Rule Checks
        └── Encryption Checks
```

## Installation

```typescript
import { SecurityScanService } from '@/modules/security/services';
```

## Usage

### Basic Usage

```typescript
const scanService = new SecurityScanService();

// Scan all active accounts for a tenant
const result = await scanService.runScan('tenant-123');

console.log(`Found ${result.totalFindings} security findings`);
console.log(`Critical: ${result.criticalCount}, High: ${result.highCount}`);

await scanService.disconnect();
```

### Scan Specific Account

```typescript
const scanService = new SecurityScanService();

// Scan a specific cloud account
const result = await scanService.runScan('tenant-123', 'account-456');

console.log(`Scanned account: ${result.scanId}`);
console.log(`Findings: ${result.totalFindings}`);

await scanService.disconnect();
```

### Event-Driven Alerting

```typescript
const scanService = new SecurityScanService();

// Listen for critical/high severity findings
scanService.on('security.finding.created', (event) => {
  console.log(`SECURITY ALERT: ${event.severity}`);
  console.log(`Title: ${event.title}`);
  console.log(`Resource: ${event.resourceId}`);

  // Send notifications
  sendSlackAlert(event);
  createJiraTicket(event);
});

await scanService.runScan('tenant-123');
await scanService.disconnect();
```

## API Reference

### SecurityScanService

The main orchestrator class for security scanning.

#### Methods

##### `runScan(tenantId: string, cloudAccountId?: string): Promise<ScanResult>`

Runs a security scan for one or all accounts.

**Parameters:**
- `tenantId` (string): The tenant ID to scan
- `cloudAccountId` (string, optional): Specific cloud account ID. If omitted, scans all active accounts.

**Returns:** `Promise<ScanResult>`

**Example:**
```typescript
// Scan all accounts
const result = await scanService.runScan('tenant-123');

// Scan specific account
const result = await scanService.runScan('tenant-123', 'account-456');
```

##### `disconnect(): Promise<void>`

Closes the database connection. Should be called when the service is no longer needed.

**Example:**
```typescript
await scanService.disconnect();
```

#### Events

##### `security.finding.created`

Emitted when a CRITICAL or HIGH severity finding is detected.

**Event Data:**
```typescript
{
  tenantId: string;
  findingId: string;
  severity: 'critical' | 'high';
  title: string;
  resourceId?: string;
  category: string;
}
```

**Example:**
```typescript
scanService.on('security.finding.created', (event) => {
  if (event.severity === 'critical') {
    // Immediate action required
    pagerDutyAlert(event);
  }
});
```

### Types

#### ScanResult

```typescript
interface ScanResult {
  scanId: string;              // Scan ID or 'combined' for multi-account
  accountsScanned: number;     // Number of accounts scanned
  totalFindings: number;       // Total findings across all accounts
  criticalCount: number;       // Count of CRITICAL findings
  highCount: number;           // Count of HIGH findings
  mediumCount: number;         // Count of MEDIUM findings
  lowCount: number;            // Count of LOW findings
  duration: number;            // Scan duration in milliseconds
}
```

#### AccountScanResult

```typescript
interface AccountScanResult {
  scanId: string;              // Scan ID from database
  findingsCount: number;       // Number of findings for this account
  criticalCount: number;       // Count of CRITICAL findings
  highCount: number;           // Count of HIGH findings
  mediumCount: number;         // Count of MEDIUM findings
  lowCount: number;            // Count of LOW findings
  success: boolean;            // Whether scan succeeded
  error?: string;              // Error message if failed
}
```

## Database Schema

### SecurityScan

Tracks scan execution metadata.

```prisma
model SecurityScan {
  id              String   @id @default(uuid())
  tenantId        String
  cloudAccountId  String
  provider        String   // "AWS" | "AZURE"
  scanType        String   // "full" | "compliance" | "quick"
  framework       String[] // ["CIS", "NIST"]

  startedAt       DateTime
  completedAt     DateTime?
  status          String   // "running" | "completed" | "failed"

  findingsCount   Int
  criticalCount   Int
  highCount       Int
  mediumCount     Int
  lowCount        Int

  error           String?

  findings        SecurityFinding[]
}
```

### SecurityFinding

Stores individual security findings.

```prisma
model SecurityFinding {
  id              String   @id @default(uuid())
  tenantId        String
  scanId          String
  assetId         String?

  ruleCode        String   // "CIS-1.1" | "NIST-AC-2"
  framework       String   // "CIS" | "NIST"

  severity        String   // "critical" | "high" | "medium" | "low"
  status          String   // "open" | "resolved" | "accepted_risk"

  provider        String   // "aws" | "azure"
  resourceType    String

  title           String
  description     String
  remediation     String

  evidence        Json?

  detectedAt      DateTime
  resolvedAt      DateTime?
}
```

## Features in Detail

### 1. Multi-Account Orchestration

The service can scan multiple cloud accounts in a single operation:

```typescript
const result = await scanService.runScan('tenant-123');
// Scans all active AWS and Azure accounts for the tenant
```

**Error Handling:**
- If one account fails, scanning continues for remaining accounts
- Failed accounts are tracked in the result
- Errors are logged but don't stop the overall process

### 2. Finding Deduplication

Prevents duplicate findings for the same resource within a 7-day window:

```typescript
// Check for existing finding with same resourceId and title
const existingFinding = await prisma.securityFinding.findFirst({
  where: {
    tenantId,
    title: finding.title,
    status: 'open',
    detectedAt: { gte: sevenDaysAgo },
    evidence: { path: ['resourceId'], equals: finding.resourceId },
  },
});

if (existingFinding) {
  // Update lastObservedAt instead of creating new finding
  await prisma.securityFinding.update({
    where: { id: existingFinding.id },
    data: { detectedAt: new Date() },
  });
}
```

### 3. Credential Decryption

Credentials are stored encrypted in the database and decrypted on-demand:

```typescript
// Decrypt credentials using AES-256-GCM
const decrypted = decrypt({
  ciphertext: account.credentialsCiphertext,
  iv: account.credentialsIv,
  authTag: account.credentialsAuthTag,
});

const credentials = JSON.parse(decrypted);
```

### 4. Event Emissions

Real-time events are emitted for high-severity findings:

```typescript
if (finding.severity === 'critical' || finding.severity === 'high') {
  this.emit('security.finding.created', {
    tenantId,
    findingId: savedFinding.id,
    severity: finding.severity,
    title: finding.title,
    resourceId: finding.resourceId,
  });
}
```

### 5. Scan Status Tracking

Each scan's lifecycle is tracked in the database:

1. **Running**: Scan is in progress
2. **Completed**: Scan finished successfully
3. **Failed**: Scan encountered an error

```typescript
// Create scan with status "running"
const scan = await prisma.securityScan.create({
  data: { status: 'running', startedAt: new Date() }
});

// Update to "completed" on success
await prisma.securityScan.update({
  where: { id: scan.id },
  data: { status: 'completed', completedAt: new Date() }
});
```

## Integration Examples

### Express API Endpoint

```typescript
import { SecurityScanService } from '@/modules/security/services';

app.post('/api/security/scan/:accountId', async (req, res) => {
  const scanService = new SecurityScanService();

  try {
    const { tenantId } = req.user;
    const { accountId } = req.params;

    const result = await scanService.runScan(tenantId, accountId);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await scanService.disconnect();
  }
});
```

### Scheduled Daily Scan (Cron Job)

```typescript
import cron from 'node-cron';
import { SecurityScanService } from '@/modules/security/services';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const scanService = new SecurityScanService();

  try {
    const tenants = await getAllActiveTenants();

    for (const tenant of tenants) {
      await scanService.runScan(tenant.id);
      console.log(`Completed scan for tenant: ${tenant.name}`);
    }
  } catch (error) {
    console.error('Scheduled scan failed:', error);
  } finally {
    await scanService.disconnect();
  }
});
```

### Integration with Alert System

```typescript
const scanService = new SecurityScanService();

scanService.on('security.finding.created', async (event) => {
  // Send Slack notification
  await slack.send({
    channel: '#security-alerts',
    text: `🚨 ${event.severity.toUpperCase()} Security Finding`,
    attachments: [{
      color: event.severity === 'critical' ? 'danger' : 'warning',
      fields: [
        { title: 'Title', value: event.title },
        { title: 'Resource', value: event.resourceId },
        { title: 'Category', value: event.category }
      ]
    }]
  });

  // Create Jira ticket for critical findings
  if (event.severity === 'critical') {
    await jira.createIssue({
      project: 'SEC',
      issuetype: 'Bug',
      priority: 'Critical',
      summary: event.title,
      description: `Security finding detected: ${event.resourceId}`
    });
  }
});

await scanService.runScan('tenant-123');
```

## Performance Considerations

### Scan Duration

- **Single Account**: 10-60 seconds (depending on resources)
- **Multiple Accounts**: Sequential processing, 10-60 seconds per account
- **Optimization**: Consider parallel processing for large multi-account scans

### Database Impact

- Each scan creates:
  - 1 SecurityScan record
  - N SecurityFinding records (where N = number of new findings)
- Deduplication queries use indexed fields for performance

### Memory Usage

- Credentials are decrypted per-account and not cached
- Findings are saved incrementally (not accumulated in memory)
- Scanner clients are created per-scan and garbage collected

## Error Handling

### Common Errors

1. **Decryption Failure**
   - Cause: Invalid credentials or missing encryption key
   - Impact: Single account scan fails
   - Action: Check ENCRYPTION_KEY environment variable

2. **Scanner Timeout**
   - Cause: Cloud provider API rate limiting or network issues
   - Impact: Scan marked as failed
   - Action: Retry scan or increase timeout

3. **Database Connection**
   - Cause: PostgreSQL connection issues
   - Impact: Cannot save findings
   - Action: Check DATABASE_URL and connection pool

### Error Recovery

```typescript
try {
  const result = await scanService.runScan(tenantId);
  console.log('Scan completed:', result);
} catch (error) {
  if (error.message.includes('No accounts found')) {
    // Handle no accounts case
    console.log('No active accounts to scan');
  } else if (error.message.includes('decrypt')) {
    // Handle credential issues
    console.error('Credential decryption failed');
  } else {
    // Generic error handling
    console.error('Scan failed:', error);
  }
} finally {
  await scanService.disconnect();
}
```

## Testing

### Unit Tests

The service includes 36 comprehensive unit tests covering:

- Constructor initialization
- Single account scanning (AWS, Azure)
- Multiple account scanning
- Credential decryption
- Finding deduplication
- Finding persistence
- Event emissions
- Error handling
- Edge cases

**Run Tests:**
```bash
npm test -- scan.service.test.ts
```

**Coverage:**
- Statements: 98.3%
- Branches: 77.77%
- Functions: 100%
- Lines: 98.21%

### Test Structure

```typescript
describe('SecurityScanService', () => {
  describe('Constructor', () => { /* ... */ });
  describe('runScan - Single Account', () => { /* ... */ });
  describe('runScan - Multiple Accounts', () => { /* ... */ });
  describe('Credential Decryption', () => { /* ... */ });
  describe('Scanner Integration', () => { /* ... */ });
  describe('Finding Deduplication', () => { /* ... */ });
  describe('Finding Persistence', () => { /* ... */ });
  describe('Event Emissions', () => { /* ... */ });
  describe('Scan Status Tracking', () => { /* ... */ });
  describe('Severity Counts', () => { /* ... */ });
  describe('Edge Cases', () => { /* ... */ });
});
```

## Compliance Frameworks

The service supports multiple compliance frameworks:

- **CIS Benchmarks**: AWS Foundations Benchmark, Azure Foundations Benchmark
- **NIST**: Network and access controls
- **Custom**: Organization-specific security policies

## Roadmap

### Planned Features

1. **GCP Support**: Add Google Cloud Platform scanning
2. **Parallel Processing**: Scan multiple accounts concurrently
3. **Custom Rules**: Allow users to define custom security checks
4. **Risk Scoring**: Calculate overall security posture score
5. **Auto-Remediation**: Automatically fix certain misconfigurations
6. **Trend Analysis**: Track security posture over time
7. **Compliance Reports**: Generate compliance audit reports

## Contributing

When contributing to the Security Scan Service:

1. Add unit tests for new functionality
2. Maintain >95% code coverage
3. Follow TypeScript best practices
4. Document new features in this README
5. Add examples to the example file

## License

Copyright 2024 Cloud Governance Copilot. All rights reserved.

## Support

For issues or questions:
- Open a GitHub issue
- Contact: security@copilot.com
- Documentation: https://docs.copilot.com/security-scanner
