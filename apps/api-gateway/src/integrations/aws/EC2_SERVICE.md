# AWS EC2 Service - Technical Documentation

## Overview

The `AWSEC2Service` provides EC2 instance discovery and asset management capabilities for the Cloud Governance Copilot. It implements asset discovery patterns that transform AWS EC2 instances into normalized `CloudAsset` objects.

## Architecture

### Class Structure

```typescript
AWSEC2Service
├── Constructor (credentials validation & client initialization)
├── Public Methods
│   ├── discoverAssets(filters?)
│   ├── getAssetDetails(resourceId)
│   └── discoverInAllRegions(filters?)
└── Private Methods
    ├── discoverInRegion(region, filters?)
    ├── getActiveRegions()
    ├── transformEC2Instance(instance, region)
    ├── extractTags(tags?)
    ├── buildEC2Filters(filters?)
    ├── matchesFilters(asset, filters?)
    ├── extractInstanceId(resourceId)
    └── executeWithRetry(operation)
```

### Key Design Decisions

1. **Multi-Region Support**
   - Primary method (`discoverAssets`) operates on configured or specified region
   - Separate `discoverInAllRegions()` method for global discovery
   - Each region uses its own EC2Client instance to avoid configuration conflicts
   - Regional clients are properly destroyed after use to prevent memory leaks

2. **Retry Logic with Exponential Backoff**
   - Automatic retry for transient errors (network issues, rate limiting)
   - No retry for authentication/authorization errors
   - No retry for invalid parameter errors
   - Exponential backoff: 1s, 2s, 4s (configurable)

3. **Error Handling Strategy**
   - Throws errors for authentication/authorization issues
   - Returns null for not-found resources
   - Logs warnings but continues for region-level failures in multi-region discovery
   - Provides detailed error messages with context

4. **Resource Identification**
   - Uses Instance ID as primary identifier (simpler than ARN)
   - Supports ARN format for compatibility: `arn:aws:ec2:region:account-id:instance/instance-id`
   - Extracts Instance ID from ARN when provided

## Data Transformation

### AWS EC2 Instance → CloudAsset Mapping

| CloudAsset Field | Source | Notes |
|-----------------|--------|-------|
| `resourceId` | `instance.InstanceId` | Instance ID (e.g., i-1234567890abcdef0) |
| `resourceType` | Static | Always "ec2:instance" |
| `name` | `tags['Name']` or `InstanceId` | Fallback to ID if Name tag missing |
| `region` | Method parameter | Passed from discovery context |
| `zone` | `instance.Placement.AvailabilityZone` | Availability zone (e.g., us-east-1a) |
| `status` | `instance.State.Name` | running, stopped, terminated, etc. |
| `tags` | `instance.Tags` | Converted to plain object |
| `metadata` | Multiple fields | See metadata structure below |
| `createdAt` | `instance.LaunchTime` | Instance launch timestamp |
| `lastModifiedAt` | `instance.LaunchTime` | EC2 doesn't track modifications |

### Metadata Structure

```typescript
{
  instanceType: string;           // e.g., "t2.micro", "m5.large"
  vpcId: string;                  // VPC identifier
  subnetId: string;               // Subnet identifier
  securityGroups: string[];       // Array of security group IDs
  publicIp: string | undefined;   // Public IP address (if assigned)
  privateIp: string | undefined;  // Private IP address
  monitoring: string;             // "enabled" | "disabled"
  platform: string;               // "linux" | "windows"
  imageId: string;                // AMI ID
  keyName: string | undefined;    // SSH key pair name
  architecture: string;           // "x86_64" | "arm64"
  rootDeviceType: string;         // "ebs" | "instance-store"
  virtualizationType: string;     // "hvm" | "paravirtual"
  hypervisor: string;             // "xen" | "nitro"
  instanceLifecycle: string;      // "spot" | undefined for on-demand
  spotInstanceRequestId: string;  // Present for spot instances
}
```

## Filter Support

### API-Level Filters (AWS SDK)

These filters are applied at the AWS API level for optimal performance:

- **Status Filter**: Maps to `instance-state-name` filter
  ```typescript
  { status: 'running' }  // Only running instances
  ```

- **Tag Filters**: Maps to `tag:key` filters
  ```typescript
  { tags: { Environment: 'production', Project: 'copilot' } }
  ```

- **Resource Type Filter**: Validated client-side
  ```typescript
  { resourceType: 'ec2:instance' }  // Only EC2 instances
  ```

### Client-Level Filters

These filters are applied after AWS API response:

- **Region Filter**: Creates region-specific client
  ```typescript
  { region: 'us-west-2' }  // Specific region
  ```

### Filter Combinations

All filters can be combined:

```typescript
const filters: AssetFilters = {
  region: 'us-east-1',
  status: 'running',
  resourceType: 'ec2:instance',
  tags: {
    Environment: 'production',
    CostCenter: 'engineering'
  }
};
```

## Usage Examples

### Basic Discovery

```typescript
const ec2Service = new AWSEC2Service({
  provider: 'aws',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: 'us-east-1'
});

// Discover all instances in configured region
const assets = await ec2Service.discoverAssets();
```

### Filtered Discovery

```typescript
// Running instances only
const running = await ec2Service.discoverAssets({ status: 'running' });

// Production instances
const production = await ec2Service.discoverAssets({
  tags: { Environment: 'production' }
});

// Specific region
const westCoast = await ec2Service.discoverAssets({ region: 'us-west-2' });
```

### Multi-Region Discovery

```typescript
// WARNING: This can take several minutes
const allAssets = await ec2Service.discoverInAllRegions({
  status: 'running'
});
```

### Get Instance Details

```typescript
// By Instance ID
const instance = await ec2Service.getAssetDetails('i-1234567890abcdef0');

// By ARN
const instance = await ec2Service.getAssetDetails(
  'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0'
);

if (instance) {
  console.log(`Instance Type: ${instance.metadata.instanceType}`);
  console.log(`VPC: ${instance.metadata.vpcId}`);
}
```

## Performance Considerations

### Single Region Discovery

- **Typical Response Time**: 1-3 seconds
- **AWS API Calls**: 1 (DescribeInstances)
- **Pagination**: Automatic via AWS SDK

### Multi-Region Discovery

- **Typical Response Time**: 30-120 seconds (16+ regions)
- **AWS API Calls**: 1 per region + 1 for region list
- **Execution**: Sequential to avoid rate limiting
- **Recommendation**: Use for scheduled jobs, not real-time requests

### Optimization Tips

1. **Use Region Filter**: Specify region to avoid default behavior
2. **Apply Status Filter**: Reduce payload size by filtering terminated instances
3. **Tag-Based Discovery**: Use tags for targeted discovery
4. **Caching**: Implement caching layer for frequently accessed data
5. **Pagination**: Handled automatically by AWS SDK

## Error Handling

### Authentication Errors

```typescript
try {
  await ec2Service.discoverAssets();
} catch (error) {
  if (error.message.includes('UnauthorizedOperation')) {
    // Missing IAM permissions
  }
  if (error.message.includes('InvalidClientTokenId')) {
    // Invalid credentials
  }
}
```

### Not Found Errors

```typescript
const instance = await ec2Service.getAssetDetails('i-invalid');
// Returns null instead of throwing
```

### Region Errors

Multi-region discovery logs errors but continues:

```typescript
const assets = await ec2Service.discoverInAllRegions();
// Assets from successful regions are returned
// Errors are logged but don't stop execution
```

## Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeRegions"
      ],
      "Resource": "*"
    }
  ]
}
```

### Permission Scoping

For security, you can scope to specific regions:

```json
{
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": ["us-east-1", "us-west-2"]
    }
  }
}
```

## Testing Strategy

### Unit Tests (Not included in this task)

Will be implemented in Task 2.7:

- Mock AWS SDK responses
- Test filter combinations
- Test error handling
- Test retry logic
- Test data transformation

### Integration Tests (Not included in this task)

Will be implemented in Task 2.7:

- Real AWS API calls (using test account)
- Multi-region discovery
- Tag filtering
- Status filtering

## Future Enhancements

1. **Pagination Support**: Handle large result sets explicitly
2. **Batch Operations**: Support multiple instance IDs in getAssetDetails
3. **Change Detection**: Track instance modifications
4. **Cost Tagging**: Include cost allocation tags
5. **Network Details**: Expand network interface information
6. **EBS Volume Discovery**: Include attached volume details
7. **CloudWatch Metrics**: Integrate instance metrics
8. **Compliance Checks**: Built-in compliance validation

## Dependencies

- `@aws-sdk/client-ec2`: ^3.946.0
- `cloud-provider.interface.ts`: Types and interfaces

## Related Services

- `AWSCostExplorerService`: Cost data for EC2 instances
- `AWSRDSService`: Database instance discovery
- `AWSS3Service`: S3 bucket discovery
- `AWSSecurityHubService`: Security findings for EC2

## Changelog

### Version 1.0.0 (2024-12-06)

- Initial implementation
- Multi-region discovery support
- Comprehensive filtering
- Retry logic with exponential backoff
- Full TypeScript type safety
- JSDoc documentation

## Support

For issues or questions:
1. Check the example file: `ec2.service.example.ts`
2. Review this documentation
3. Check AWS SDK documentation
4. Contact the platform team
