# AWS Integration Services

This directory contains AWS-specific integration services that implement the `CloudProvider` interface for multi-cloud support.

## Available Services

### AWSCostExplorerService

Integrates with AWS Cost Explorer API to retrieve cost and usage data.

**Features:**
- Retrieve cost data with daily granularity
- Filter by service, region, and tags
- Group costs by service with percentages
- Cost trends with configurable granularity (daily/weekly/monthly)
- Automatic retry logic with exponential backoff
- Handles AWS throttling and rate limiting

**File:** `cost-explorer.service.ts`

**Usage Example:**
```typescript
import { AWSCostExplorerService } from './aws';
import type { CloudProviderCredentials, DateRange } from './cloud-provider.interface';

const credentials: CloudProviderCredentials = {
  provider: 'aws',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  awsRegion: 'us-east-1',
};

const service = new AWSCostExplorerService(credentials);

// Validate credentials
const isValid = await service.validateCredentials();

// Get costs for date range
const dateRange: DateRange = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31'),
};

const costs = await service.getCosts(dateRange);

// Get costs by service
const costsByService = await service.getCostsByService(dateRange);

// Get cost trends
const trends = await service.getCostTrends(dateRange, 'monthly');
```

See `cost-explorer.example.ts` for more detailed usage examples.

### AWSEC2Service

Integrates with AWS EC2 API for asset discovery and management.

**File:** `ec2.service.ts`

*(Documentation to be added)*

## IAM Permissions Required

### Cost Explorer Service

The AWS IAM user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:DescribeCostCategoryDefinition",
        "ce:ListCostCategoryDefinitions"
      ],
      "Resource": "*"
    }
  ]
}
```

## Environment Variables

### AWS Credentials

```bash
# Required
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...

# Optional (defaults to us-east-1)
AWS_REGION=us-east-1
```

## Error Handling

All services implement automatic retry logic with exponential backoff for transient errors:

- **Throttling (429)**: Automatically retried up to 3 times
- **Rate Limiting**: Automatically retried with backoff
- **Network Errors**: Automatically retried
- **Service Unavailable (503)**: Automatically retried

Non-retryable errors (authentication, authorization) are thrown immediately.

## Cost Explorer API Limits

- **Requests per second**: 10 (shared across all Cost Explorer APIs)
- **Daily request limit**: 100,000
- **Data availability**: Up to 13 months of historical data
- **Granularity**: DAILY or MONTHLY (no native WEEKLY support)

## Architecture Notes

### Interface Implementation

All AWS services implement the `CloudProvider` interface defined in `cloud-provider.interface.ts`. This ensures:

- Consistent API across AWS, Azure, and GCP
- Easy switching between providers
- Module code remains provider-agnostic

### Service Separation

Each AWS service is focused on a specific domain:

- **cost-explorer.service.ts**: Cost management only
- **ec2.service.ts**: EC2 asset discovery
- **rds.service.ts**: RDS asset discovery (future)
- **s3.service.ts**: S3 asset discovery (future)
- **security-hub.service.ts**: Security scanning (future)

This separation allows:
- Fine-grained IAM permissions
- Independent scaling
- Easier testing and maintenance

### Data Normalization

All AWS responses are normalized to the common `CloudCostData`, `CloudAsset`, and `SecurityFinding` types. This ensures consuming modules don't need AWS-specific logic.

## Testing

Tests are located in `/tests/integration/aws/` (to be implemented in Task 2.7).

## Future Services

- [ ] AWS RDS Service
- [ ] AWS S3 Service
- [ ] AWS Security Hub Service
- [ ] AWS Config Service
- [ ] AWS CloudWatch Service

## Related Files

- `../cloud-provider.interface.ts` - Interface definitions
- `../../modules/finops/` - FinOps module consuming cost data
- `../../modules/assets/` - Assets module consuming asset data
- `../../modules/security/` - Security module consuming security findings
