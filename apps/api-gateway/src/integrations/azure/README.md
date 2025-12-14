# Azure Integration Services

Azure cloud provider integration services for Cloud Governance Copilot.

## Overview

This directory contains Azure-specific integration services that implement the CloudProvider interface defined in `cloud-provider.interface.ts`. These services provide normalized access to Azure resources, following the same patterns established for AWS integrations.

## Available Services

### Azure Compute Service (`compute.service.ts`)

Handles Azure Virtual Machine discovery and asset management.

**Features:**
- Discover Virtual Machines across Azure subscriptions
- Multi-subscription support
- Region-based filtering (Azure locations)
- Tag-based filtering
- Status-based filtering
- Instance view support for power state detection
- Retry logic with exponential backoff
- Comprehensive error handling

**Supported Resource Types:**
- `virtual_machine` - Azure Virtual Machines (normalized from `Microsoft.Compute/virtualMachines`)

**Authentication:**
- Uses Service Principal authentication (Client ID, Client Secret, Tenant ID)
- Requires subscription ID for scoping

**Required Permissions:**
```
Microsoft.Compute/virtualMachines/read
Microsoft.Compute/virtualMachines/instanceView/read
```

**Basic Usage:**
```typescript
import { AzureComputeService } from './integrations/azure';

const service = new AzureComputeService({
  provider: 'azure',
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID
});

// Discover all VMs
const vms = await service.discoverAssets();

// Discover with filters
const runningVMs = await service.discoverAssets({
  region: 'eastus',
  status: 'running',
  tags: { Environment: 'production' }
});

// Multi-subscription discovery
const allVMs = await service.discoverInAllSubscriptions([
  'subscription-id-1',
  'subscription-id-2'
]);
```

**CloudAsset Mapping:**

| Azure VM Property | CloudAsset Field | Notes |
|------------------|------------------|-------|
| `id` | `resourceId` | Full Azure resource URI |
| `name` | `name` | VM name |
| `location` | `region` | Azure region (e.g., "eastus") |
| `zones[0]` | `zone` | Availability zone |
| PowerState | `status` | Normalized (running, stopped, pending, stopping) |
| `tags` | `tags` | Key-value pairs |
| `hardwareProfile.vmSize` | `metadata.vmSize` | e.g., "Standard_D2s_v3" |
| `storageProfile.osDisk.osType` | `metadata.osType` | Linux or Windows |
| Resource Group | `metadata.resourceGroup` | Extracted from resource ID |
| Subscription ID | `metadata.subscriptionId` | Azure subscription |

**Status Normalization:**

| Azure Power State | Normalized Status |
|------------------|-------------------|
| "VM running" | running |
| "VM stopped" | stopped |
| "VM deallocated" | stopped |
| "VM starting" | pending |
| "VM stopping" | stopping |

### Azure Cost Management Service (`cost-management.service.ts`)

Handles Azure cost data retrieval and analysis using Azure Cost Management API.

**Features:**
- Retrieve cost data with daily/monthly granularity
- Filter by service (Meter Category), region, and tags
- Group costs by service
- Cost trends over time
- Retry logic with exponential backoff for rate limiting
- Comprehensive error handling

**Cost Data Operations:**
- `getCosts(dateRange, filters?)` - Get detailed cost data
- `getCostsByService(dateRange)` - Aggregate costs by Azure service
- `getCostTrends(dateRange, granularity)` - Cost trends (daily/weekly/monthly)

**Authentication:**
- Uses Service Principal authentication (Client ID, Client Secret, Tenant ID)
- Requires subscription ID for cost queries

**Required Permissions:**
```
Microsoft.CostManagement/query/action
```

**Basic Usage:**
```typescript
import { AzureCostManagementService } from './integrations/azure';

const service = new AzureCostManagementService({
  provider: 'azure',
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID
});

// Validate credentials
const isValid = await service.validateCredentials();

// Get costs for January 2024
const costs = await service.getCosts({
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
});

// Get costs by service
const costsByService = await service.getCostsByService({
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
});

// Get monthly cost trends
const trends = await service.getCostTrends(
  { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
  'monthly'
);
```

**CloudCostData Mapping:**

| Azure Cost API Field | CloudCostData Field | Notes |
|---------------------|---------------------|-------|
| `Cost` (column) | `amount` | Cost amount |
| `MeterCategory` | `service` | Azure service name (e.g., "Virtual Machines") |
| `UsageDate` | `date` | Date of usage |
| `ResourceLocation` | `region` | Azure region (e.g., "eastus") |
| `ResourceGroup` | `metadata.resourceGroup` | Resource group name |
| Subscription ID | `metadata.subscriptionId` | Azure subscription |
| Granularity | `metadata.granularity` | "Daily" or "Monthly" |
| Currency | `currency` | Default: "USD" |

**Service Name Mapping:**

| Azure Meter Category | Service Display Name |
|---------------------|---------------------|
| Virtual Machines | Virtual Machines |
| Storage | Storage |
| SQL Database | SQL Database |
| Bandwidth | Bandwidth |
| Azure Kubernetes Service | Azure Kubernetes Service |

**Granularity Support:**

| User Granularity | Azure API Granularity | Notes |
|-----------------|----------------------|-------|
| daily | Daily | Full daily breakdown |
| weekly | Daily | Returns daily data (aggregate client-side for weekly) |
| monthly | Monthly | Monthly aggregation |

**Rate Limiting:**
- Azure Cost Management API has strict rate limits
- Implements exponential backoff (1s → 2s → 4s, max 10s)
- Retries on 429, 500, 503 errors
- Does NOT retry on 401, 403 (auth errors)

## Architecture Patterns

### Service Structure

All Azure services follow the same pattern as AWS services:

1. **Constructor Pattern**
   - Accept `CloudProviderCredentials`
   - Validate required credentials
   - Initialize Azure SDK clients

2. **Main Methods**
   - `discoverAssets(filters?)`: Discover resources with optional filters
   - `getAssetDetails(resourceId)`: Get detailed information for specific resource
   - Multi-scope method (e.g., `discoverInAllSubscriptions()`)

3. **Private Helpers**
   - `transformToAsset()`: Convert Azure resource to CloudAsset
   - `matchesFilters()`: Apply client-side filters
   - `executeWithRetry()`: Retry logic implementation

### Error Handling

**Retryable Errors:**
- Rate limiting (429)
- Network errors
- Service unavailable (503)

**Non-Retryable Errors:**
- Authentication failures (401)
- Authorization failures (403)
- Not found (404)
- Invalid parameters

**Retry Configuration:**
- Max retries: 3
- Initial delay: 1000ms
- Backoff strategy: Exponential (2^attempt)

### Logging

All services use structured logging with service-specific prefixes:
```typescript
console.log('[AzureComputeService] Discovery started');
console.error('[AzureComputeService] Error:', error);
console.warn('[AzureComputeService] Retry attempt 2/3');
```

## Azure-Specific Considerations

### Resource IDs

Azure uses hierarchical resource IDs:
```
/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProvider}/{resourceType}/{resourceName}
```

Example:
```
/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm
```

### Subscriptions vs Regions

Unlike AWS (which uses regions as primary scope), Azure uses:
- **Subscription**: Billing and management boundary
- **Resource Group**: Logical grouping within subscription
- **Location/Region**: Physical datacenter location

Services support both single-subscription and multi-subscription discovery.

### Instance View

Azure requires explicit `expand: 'instanceView'` parameter to retrieve:
- Power state (running, stopped, etc.)
- VM agent status
- Extension status

Without instance view, power state is unknown.

### Authentication

Azure uses Azure Active Directory (AAD) for authentication:
- **Service Principal**: Application identity for automation
- **Client Secret Credential**: Client ID + Secret + Tenant ID
- **Scope**: `https://management.azure.com/.default` for ARM APIs

## Dependencies

```json
{
  "@azure/arm-compute": "^23.2.0",
  "@azure/arm-network": "^35.0.0",
  "@azure/identity": "^4.13.0"
}
```

## Testing

Test files are located in `__tests__/` directory.

Run tests:
```bash
npm test -- azure
```

## Examples

### Compute Service Examples

See `compute.service.example.ts` for comprehensive usage examples including:
- Basic discovery
- Multi-region filtering
- Tag-based filtering
- Multi-subscription discovery
- Disk configuration analysis
- Cost optimization scenarios
- Error handling patterns

### Cost Management Service Examples

See `cost-management.example.ts` for comprehensive usage examples including:
- Credential validation
- Basic cost retrieval
- Multi-filter cost queries (service, region, tags)
- Cost breakdown by service
- Cost trends with multiple granularities
- Multi-region cost analysis
- Service-specific cost analysis
- Error handling patterns

## Future Services

Planned Azure integration services:

- **AzureStorageService**: Blob storage, file shares
- **AzureSQLService**: SQL databases, managed instances
- **AzureSecurityCenterService**: Security findings and recommendations
- **AzureNetworkService**: Virtual networks, NSGs, load balancers
- **AzureMonitorService**: Metrics and alerts

## Contributing

When adding new Azure services:

1. Follow the pattern established by `AzureComputeService`
2. Implement CloudProvider interface methods
3. Add comprehensive JSDoc documentation
4. Include retry logic with exponential backoff
5. Add structured logging with service prefix
6. Create example usage file
7. Add unit tests
8. Update this README

## References

- [Azure SDK for JavaScript/TypeScript](https://github.com/Azure/azure-sdk-for-js)
- [Azure Compute Management API](https://learn.microsoft.com/en-us/javascript/api/@azure/arm-compute)
- [Azure Identity Library](https://learn.microsoft.com/en-us/javascript/api/@azure/identity)
- [CloudProvider Interface](../cloud-provider.interface.ts)
