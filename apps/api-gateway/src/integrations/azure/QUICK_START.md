# Azure Cost Management Service - Quick Start Guide

## Prerequisites

1. **Azure Account** with active subscription
2. **Service Principal** created with Cost Management permissions
3. **Environment variables** configured

## Step 1: Create Service Principal

### Option A: Azure Portal

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Name: "Cloud-Governance-Copilot-CostManagement"
4. Click "Register"
5. Note the **Application (client) ID** and **Directory (tenant) ID**
6. Go to "Certificates & secrets" → "New client secret"
7. Create secret and note the **Value** (client secret)

### Option B: Azure CLI

```bash
# Create Service Principal
az ad sp create-for-rbac \
  --name "Cloud-Governance-Copilot-CostManagement" \
  --role "Cost Management Reader" \
  --scopes "/subscriptions/{your-subscription-id}"

# Output will contain:
# - appId (clientId)
# - password (clientSecret)
# - tenant (tenantId)
```

## Step 2: Assign Permissions

### Required Permission

The Service Principal needs:
- **Role**: `Cost Management Reader`
- **Scope**: Subscription level

### Assign via Azure Portal

1. Go to Subscriptions → Your Subscription
2. Click "Access control (IAM)"
3. Click "Add" → "Add role assignment"
4. Select "Cost Management Reader"
5. Select your Service Principal
6. Click "Save"

### Assign via Azure CLI

```bash
# Get Service Principal Object ID
SP_OBJECT_ID=$(az ad sp list --display-name "Cloud-Governance-Copilot-CostManagement" --query "[0].id" -o tsv)

# Assign Cost Management Reader role
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --role "Cost Management Reader" \
  --scope "/subscriptions/{your-subscription-id}"
```

## Step 3: Configure Environment Variables

Create a `.env` file or add to your existing one:

```bash
# Azure Cost Management Credentials
AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
```

**Security Note**: Never commit `.env` files to version control!

## Step 4: Install Dependencies

Dependencies are already in package.json:

```bash
npm install
```

Required packages:
- `@azure/arm-costmanagement@^1.0.0-beta.1`
- `@azure/identity@^4.13.0`

## Step 5: Basic Usage

### Initialize Service

```typescript
import { AzureCostManagementService } from './integrations/azure';

const service = new AzureCostManagementService({
  provider: 'azure',
  azureClientId: process.env.AZURE_CLIENT_ID!,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
  azureTenantId: process.env.AZURE_TENANT_ID!,
  azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
});
```

### Validate Credentials

```typescript
const isValid = await service.validateCredentials();

if (!isValid) {
  throw new Error('Azure credentials are invalid or insufficient permissions');
}

console.log('Azure credentials validated successfully!');
```

### Get Cost Data

```typescript
// Define date range (last 30 days)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

// Get all costs
const costs = await service.getCosts({
  start: startDate,
  end: endDate,
});

console.log(`Retrieved ${costs.length} cost entries`);

// Calculate total
const totalCost = costs.reduce((sum, cost) => sum + cost.amount, 0);
console.log(`Total cost: $${totalCost.toFixed(2)}`);
```

### Get Costs by Service

```typescript
const costsByService = await service.getCostsByService({
  start: startDate,
  end: endDate,
});

console.log('Top 5 services by cost:');
costsByService.slice(0, 5).forEach((item, index) => {
  console.log(
    `${index + 1}. ${item.service}: $${item.totalCost.toFixed(2)} (${item.percentage.toFixed(1)}%)`
  );
});
```

### Get Cost Trends

```typescript
// Get monthly trends for Q1 2024
const trends = await service.getCostTrends(
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-03-31'),
  },
  'monthly'
);

trends.forEach((trend) => {
  console.log(
    `${trend.date.toISOString().slice(0, 7)}: $${trend.totalCost.toFixed(2)}`
  );
});
```

## Step 6: Advanced Filtering

### Filter by Service

```typescript
// Get only Virtual Machine costs
const vmCosts = await service.getCosts(
  { start: startDate, end: endDate },
  { service: 'Virtual Machines' }
);
```

### Filter by Region

```typescript
// Get costs for East US region
const eastUSCosts = await service.getCosts(
  { start: startDate, end: endDate },
  { region: 'eastus' }
);
```

### Filter by Tags

```typescript
// Get production environment costs
const prodCosts = await service.getCosts(
  { start: startDate, end: endDate },
  {
    tags: {
      Environment: 'production',
      Team: 'engineering',
    },
  }
);
```

### Combined Filters

```typescript
// Production VMs in East US
const filteredCosts = await service.getCosts(
  { start: startDate, end: endDate },
  {
    service: 'Virtual Machines',
    region: 'eastus',
    tags: { Environment: 'production' },
  }
);
```

## Step 7: Error Handling

```typescript
try {
  const costs = await service.getCosts({
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  });

  console.log(`Successfully retrieved ${costs.length} cost entries`);
} catch (error: any) {
  if (error.statusCode === 401) {
    console.error('Invalid credentials - check Service Principal');
  } else if (error.statusCode === 403) {
    console.error('Insufficient permissions - assign Cost Management Reader role');
  } else if (error.statusCode === 429) {
    console.error('Rate limited - retry after delay');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Common Azure Services

When filtering by service, use these exact names (case-sensitive):

| Service Name | Description |
|-------------|-------------|
| `Virtual Machines` | Azure VMs |
| `Storage` | Blob, File, Queue, Table storage |
| `SQL Database` | Azure SQL Database |
| `Azure Kubernetes Service` | AKS clusters |
| `Bandwidth` | Data transfer costs |
| `Virtual Network` | VNet, VPN Gateway |
| `Load Balancer` | Azure Load Balancer |
| `Azure App Service` | Web Apps, API Apps |
| `Azure Functions` | Serverless compute |
| `Cosmos DB` | NoSQL database |

**Tip**: Run `getCostsByService()` to see all services in your subscription.

## Common Azure Regions

When filtering by region, use these location codes:

| Region Code | Region Name |
|------------|-------------|
| `eastus` | East US |
| `eastus2` | East US 2 |
| `westus` | West US |
| `westus2` | West US 2 |
| `centralus` | Central US |
| `northeurope` | North Europe |
| `westeurope` | West Europe |
| `southeastasia` | Southeast Asia |
| `eastasia` | East Asia |
| `japaneast` | Japan East |

**Tip**: Run `getCosts()` without filters and check the `region` field to see all regions used.

## Troubleshooting

### Error: "Invalid Azure credentials"

**Solution**:
1. Verify environment variables are set correctly
2. Check Service Principal hasn't expired
3. Regenerate client secret if needed

### Error: "Access denied"

**Solution**:
1. Verify Service Principal has "Cost Management Reader" role
2. Check role is assigned at Subscription level
3. Wait 5-10 minutes for role assignment to propagate

### Error: "Too many requests"

**Solution**:
1. Azure Cost Management has rate limits
2. Service implements automatic retry with backoff
3. Reduce frequency of queries or implement caching

### Empty Results

**Solution**:
1. Verify subscription has cost data for the date range
2. Check filters aren't too restrictive
3. Ensure date range is not in the future
4. Azure may have 24-48 hour delay in cost data availability

## Performance Tips

1. **Use appropriate granularity**:
   - Daily: For detailed analysis (last 30 days)
   - Monthly: For trends (last 12 months)

2. **Filter early**:
   - Use API filters instead of client-side filtering
   - Reduces data transfer and processing

3. **Cache results**:
   - Cost data doesn't change frequently
   - Cache for 1-4 hours depending on use case

4. **Batch queries**:
   - Get all data in one query when possible
   - Use filters to reduce payload

## Next Steps

1. **Explore examples**: Check `cost-management.example.ts` for more use cases
2. **Read documentation**: See `README.md` for detailed API reference
3. **Integration**: Integrate with FinOps module
4. **Monitoring**: Set up alerts for cost anomalies
5. **Optimization**: Use insights to reduce cloud spend

## Support

For issues or questions:
1. Check `COST_MANAGEMENT_IMPLEMENTATION.md` for technical details
2. Review `README.md` for architecture patterns
3. See `cost-management.example.ts` for usage examples
4. Consult Azure Cost Management API documentation

## Resources

- [Azure Cost Management API](https://learn.microsoft.com/en-us/rest/api/cost-management/)
- [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js)
- [Service Principal Best Practices](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Cost Management Reader Role](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#cost-management-reader)
