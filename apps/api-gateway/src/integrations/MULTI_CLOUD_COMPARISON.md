# Multi-Cloud Integration Comparison

Comparison between AWS EC2 and Azure Compute service implementations.

## Architecture Alignment

Both services follow the **exact same pattern** for consistency across cloud providers.

### Side-by-Side Comparison

| Aspect | AWS EC2 Service | Azure Compute Service |
|--------|----------------|----------------------|
| **SDK** | `@aws-sdk/client-ec2` | `@azure/arm-compute` |
| **Auth** | Access Key + Secret | Service Principal (Client ID + Secret + Tenant) |
| **Scope** | Region | Subscription |
| **Resource Type** | `ec2:instance` | `virtual_machine` |
| **Status Source** | `instance.State.Name` | `instance.instanceView.statuses` (PowerState) |
| **Resource ID** | Instance ID (e.g., `i-1234...`) | Full URI (e.g., `/subscriptions/.../virtualMachines/vm`) |
| **Multi-Scope** | `discoverInAllRegions()` | `discoverInAllSubscriptions()` |
| **Retry Logic** | 3 retries, exponential backoff | 3 retries, exponential backoff (identical) |

## Code Structure Comparison

### Constructor Pattern

**AWS EC2:**
```typescript
constructor(credentials: CloudProviderCredentials) {
  if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
    throw new Error('AWS credentials are required');
  }

  this.client = new EC2Client({
    region: this.region,
    credentials: {
      accessKeyId: credentials.awsAccessKeyId,
      secretAccessKey: credentials.awsSecretAccessKey,
    },
    maxAttempts: this.maxRetries,
  });
}
```

**Azure Compute:**
```typescript
constructor(credentials: CloudProviderCredentials) {
  if (!credentials.azureClientId || !credentials.azureClientSecret ||
      !credentials.azureTenantId || !credentials.azureSubscriptionId) {
    throw new Error('Azure credentials are required');
  }

  this.credential = new ClientSecretCredential(
    credentials.azureTenantId,
    credentials.azureClientId,
    credentials.azureClientSecret
  );

  this.client = new ComputeManagementClient(
    this.credential,
    credentials.azureSubscriptionId
  );
}
```

### Discovery Pattern

**AWS EC2:**
```typescript
async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
  if (filters?.region) {
    return await this.discoverInRegion(filters.region, filters);
  }
  return await this.discoverInRegion(this.region, filters);
}

private async discoverInRegion(region: string, filters?: AssetFilters) {
  const command = new DescribeInstancesCommand({ Filters: ec2Filters });
  const response = await this.executeWithRetry(() => client.send(command));

  const assets: CloudAsset[] = [];
  for (const reservation of response.Reservations || []) {
    for (const instance of reservation.Instances || []) {
      const asset = this.transformEC2Instance(instance, region);
      if (this.matchesFilters(asset, filters)) {
        assets.push(asset);
      }
    }
  }
  return assets;
}
```

**Azure Compute:**
```typescript
async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
  if (filters?.resourceType && filters.resourceType !== 'virtual_machine') {
    return [];
  }
  return await this.discoverInSubscription(this.config.subscriptionId, filters);
}

private async discoverInSubscription(subscriptionId: string, filters?: AssetFilters) {
  const vmsIterator = client.virtualMachines.listAll({ expand: 'instanceView' });

  const assets: CloudAsset[] = [];
  for await (const vm of vmsIterator) {
    const asset = this.transformVMToAsset(vm, subscriptionId);
    if (this.matchesFilters(asset, filters)) {
      assets.push(asset);
    }
  }
  return assets;
}
```

### Transformation Pattern

**AWS EC2:**
```typescript
private transformEC2Instance(instance: Instance, region: string): CloudAsset {
  return {
    resourceId: instance.InstanceId || 'unknown',
    resourceType: 'ec2:instance',
    name: tags['Name'] || instanceId,
    region,
    zone: instance.Placement?.AvailabilityZone,
    status: instance.State?.Name || 'unknown',
    tags: this.extractTags(instance.Tags),
    metadata: {
      instanceType: instance.InstanceType,
      vpcId: instance.VpcId,
      publicIp: instance.PublicIpAddress,
      // ... more metadata
    },
    createdAt: instance.LaunchTime,
    lastModifiedAt: instance.LaunchTime,
  };
}
```

**Azure Compute:**
```typescript
private transformVMToAsset(vm: VirtualMachine, subscriptionId: string): CloudAsset {
  return {
    resourceId: vm.id || 'unknown',
    resourceType: 'virtual_machine',
    name: vm.name || 'unknown',
    region: vm.location || 'unknown',
    zone: vm.zones?.[0],
    status: this.normalizePowerState(this.extractPowerState(vm)),
    tags: vm.tags || {},
    metadata: {
      vmSize: vm.hardwareProfile?.vmSize,
      osType: vm.storageProfile?.osDisk?.osType,
      resourceGroup: this.extractResourceGroup(vm.id),
      subscriptionId,
      // ... more metadata
    },
    createdAt: vm.timeCreated,
    lastModifiedAt: vm.timeCreated,
  };
}
```

### Retry Logic Pattern

**Both services use identical retry logic:**

```typescript
private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < this.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors (401, 403)
      if (this.isNonRetryableError(lastError)) {
        throw lastError;
      }

      // Exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempt);
      console.warn(`[Service] Attempt ${attempt + 1}/${this.maxRetries} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Operation failed after ${this.maxRetries} attempts: ${lastError?.message}`);
}
```

## Usage Examples Comparison

### Basic Discovery

**AWS:**
```typescript
const ec2Service = new AWSEC2Service({
  provider: 'aws',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: 'us-east-1'
});

const instances = await ec2Service.discoverAssets();
```

**Azure:**
```typescript
const computeService = new AzureComputeService({
  provider: 'azure',
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID
});

const vms = await computeService.discoverAssets();
```

### Filtered Discovery

**AWS:**
```typescript
const runningInstances = await ec2Service.discoverAssets({
  region: 'us-west-2',
  status: 'running',
  tags: { Environment: 'production' }
});
```

**Azure:**
```typescript
const runningVMs = await computeService.discoverAssets({
  region: 'westus2',
  status: 'running',
  tags: { Environment: 'production' }
});
```

### Multi-Scope Discovery

**AWS (Multi-Region):**
```typescript
const allInstances = await ec2Service.discoverInAllRegions({
  status: 'running'
});

// Groups by region automatically
const byRegion = allInstances.reduce((acc, asset) => {
  acc[asset.region] = (acc[asset.region] || 0) + 1;
  return acc;
}, {});
```

**Azure (Multi-Subscription):**
```typescript
const allVMs = await computeService.discoverInAllSubscriptions(
  ['sub-1', 'sub-2', 'sub-3'],
  { status: 'running' }
);

// Groups by subscription
const bySubscription = allVMs.reduce((acc, asset) => {
  acc[asset.metadata.subscriptionId] = (acc[asset.metadata.subscriptionId] || 0) + 1;
  return acc;
}, {});
```

## Metadata Comparison

### Common Metadata (All Providers)

| Field | AWS EC2 | Azure Compute |
|-------|---------|---------------|
| Instance/VM Size | `instanceType` (t2.micro) | `vmSize` (Standard_D2s_v3) |
| Public IP | `publicIp` | Not in compute service (requires network API) |
| Private IP | `privateIp` | Not in compute service (requires network API) |
| OS Type | `platform` (linux/windows) | `osType` (Linux/Windows) |
| Launch Time | `createdAt` | `createdAt` |

### AWS-Specific Metadata

```typescript
{
  vpcId: 'vpc-123456',
  subnetId: 'subnet-123456',
  securityGroups: ['sg-123456'],
  monitoring: 'enabled',
  imageId: 'ami-123456',
  keyName: 'my-keypair',
  instanceLifecycle: 'spot',
  spotInstanceRequestId: 'sir-123456'
}
```

### Azure-Specific Metadata

```typescript
{
  resourceGroup: 'my-rg',
  subscriptionId: 'sub-id',
  vmId: 'unique-vm-id',
  provisioningState: 'Succeeded',
  powerState: 'VM running',
  osDiskSize: 30,
  dataDisks: [...],
  networkInterfaces: ['nic-id-1'],
  licenseType: 'Windows_Server',
  availabilitySetId: '/subscriptions/.../availabilitySets/...',
  priority: 'Spot',
  billingProfile: { maxPrice: 0.5 }
}
```

## Status Normalization

### AWS EC2 States → Normalized

| AWS State | Normalized |
|-----------|------------|
| running | running |
| stopped | stopped |
| pending | pending |
| stopping | stopping |
| shutting-down | stopping |
| terminated | terminated |

### Azure PowerStates → Normalized

| Azure PowerState | Normalized |
|-----------------|------------|
| VM running | running |
| VM stopped | stopped |
| VM deallocated | stopped |
| VM starting | pending |
| VM stopping | stopping |

## Filter Application

### API-Level Filters (Provider SDK)

**AWS:**
- Status (instance-state-name)
- Tags (tag:Key)
- VPC, Subnet, etc.

**Azure:**
- Limited API filtering
- Primarily client-side filtering

### Client-Side Filters (matchesFilters)

Both services implement identical client-side filtering for:
- Resource type
- Region/Location
- Status
- Tags (all must match)

## Error Handling

### Non-Retryable Errors

**AWS:**
- `UnauthorizedOperation`
- `UnrecognizedClientException`
- `InvalidClientTokenId`
- `InvalidParameterValue`
- `ValidationError`

**Azure:**
- `AuthenticationFailed`
- `AuthorizationFailed`
- `ResourceNotFound`
- `InvalidParameter`
- `ValidationError`

### Retryable Errors

**Both:**
- Rate limiting (429)
- Service unavailable (503)
- Network timeouts
- Generic 500 errors

## Performance Considerations

### AWS EC2
- **Regional isolation**: Each region requires separate client and API call
- **Sequential processing**: Processes regions one by one to avoid rate limiting
- **Pagination**: Handles large result sets automatically via SDK

### Azure Compute
- **Subscription isolation**: Each subscription requires separate discovery
- **Parallel processing**: Subscriptions can be queried in parallel (Promise.all)
- **Async iteration**: Uses async iterators for memory-efficient processing

## Integration Points

### How to Use Both Services Together

```typescript
import { AWSEC2Service } from './integrations/aws';
import { AzureComputeService } from './integrations/azure';

async function discoverAllCloudAssets() {
  const allAssets: CloudAsset[] = [];

  // AWS Discovery
  if (hasAWSCredentials) {
    const ec2 = new AWSEC2Service(awsCredentials);
    const awsAssets = await ec2.discoverInAllRegions();
    allAssets.push(...awsAssets);
  }

  // Azure Discovery
  if (hasAzureCredentials) {
    const compute = new AzureComputeService(azureCredentials);
    const azureAssets = await compute.discoverInAllSubscriptions(subscriptionIds);
    allAssets.push(...azureAssets);
  }

  // Unified view - all normalized to CloudAsset format
  return allAssets;
}

// Group by provider
const byProvider = allAssets.reduce((acc, asset) => {
  const provider = asset.resourceType.includes('ec2') ? 'aws' : 'azure';
  acc[provider] = (acc[provider] || 0) + 1;
  return acc;
}, {});
```

## Key Takeaways

1. **Consistent Interface**: Both services implement the same methods and patterns
2. **Normalized Output**: CloudAsset format is identical regardless of provider
3. **Provider-Specific**: Metadata preserves provider-specific details
4. **Flexible Filtering**: Client-side filtering ensures consistent behavior
5. **Robust Retry**: Identical retry logic across all services
6. **Error Handling**: Clear distinction between retryable and non-retryable errors
7. **Logging**: Structured logging with service-specific prefixes
8. **Documentation**: Comprehensive JSDoc and example files

This architecture makes it trivial to add GCP support following the same pattern.
