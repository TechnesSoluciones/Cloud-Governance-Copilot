# Recommendation Generator Service

## Overview

The **Recommendation Generator Service** is a core component of the Cloud Governance Copilot FinOps platform that analyzes cloud cost data to generate actionable cost optimization recommendations. It identifies opportunities to reduce cloud spending across AWS and Azure by detecting idle resources, rightsizing opportunities, unused resources, old snapshots, and Reserved Instance opportunities.

## Architecture

### Service Design Patterns

- **Strategy Pattern**: Provider-specific analyzers (AWS vs Azure)
- **Template Method**: Standardized recommendation generation workflow
- **Event-Driven Architecture**: Emits events for downstream processing
- **Statistical Analysis**: Pattern detection in historical cost data
- **Deduplication**: Prevents duplicate recommendations

### Key Components

```typescript
RecommendationGeneratorService
├── generateRecommendations()        // Main entry point
├── analyzeAWSAccount()             // AWS-specific analysis
├── analyzeAzureAccount()           // Azure-specific analysis
├── detectAWSIdleEC2()              // AWS idle instance detection
├── detectAWSUnusedEBS()            // AWS unused volume detection
├── detectAWSOldSnapshots()         // AWS old snapshot detection
├── detectAWSRightsizing()          // AWS rightsizing opportunities
├── detectAWSReservedInstanceOpportunities()  // AWS RI recommendations
├── detectAzureIdleVMs()            // Azure idle VM detection
├── detectAzureUnusedDisks()        // Azure unused disk detection
├── detectAzureOldSnapshots()       // Azure old snapshot detection
├── detectAzureRightsizing()        // Azure VM rightsizing
└── deduplicateAndSaveRecommendations()  // Deduplication & persistence
```

## Recommendation Types

### 1. IDLE_RESOURCE

**Detection Logic:**
- Resources with consistently low costs (<5% of expected minimum cost)
- Minimum 25 days of data in 30-day analysis window
- Compares actual cost against expected minimum instance cost

**Estimated Savings:**
- 95% of monthly average cost (assumes termination)

**Example:**
```
Title: Idle EC2 Instance: i-1234567890
Description: This EC2 instance has consistently low utilization (3.2% of expected cost)
             over 28 days. Average daily cost: $0.15. Consider terminating if no longer needed.
Priority: medium (estimated $4.28/month savings)
```

### 2. RIGHTSIZE

**Detection Logic:**
- Instances with consistent costs but could use smaller instance type
- 25+ days of usage data
- Instance type can be downsized (e.g., t3.large → t3.medium)

**Estimated Savings:**
- Difference between current and target instance pricing

**Example:**
```
Title: Rightsize EC2 Instance: i-9876543210
Description: This t3.large instance could be downsized to t3.medium based on usage patterns.
             Current monthly cost: $61.34. Estimated cost after rightsizing: $30.67.
Priority: high (estimated $30.67/month savings)
```

### 3. UNUSED_RESOURCE

**Detection Logic:**
- Unattached EBS volumes or managed disks
- Consistent storage costs with no compute association
- 20+ days of data, savings >$5/month threshold

**Estimated Savings:**
- Full monthly storage cost

**Example:**
```
Title: Unused EBS Volume: vol-1234567890
Description: This EBS volume appears to be unattached or unused. Average daily cost: $2.40.
             Consider deleting after creating a snapshot if data needs to be retained.
Priority: medium (estimated $72/month savings)
Action Script:
  aws ec2 create-snapshot --volume-id vol-1234567890 --description "Backup before deletion"
  aws ec2 delete-volume --volume-id vol-1234567890
```

### 4. DELETE_SNAPSHOT

**Detection Logic:**
- Snapshots present throughout entire 30-day analysis window (suggests >90 days old)
- 28+ days of consistent snapshot costs
- Savings >$2/month threshold

**Estimated Savings:**
- Full monthly snapshot storage cost

**Example:**
```
Title: Old EBS Snapshot: snap-1234567890
Description: This snapshot has been retained for an extended period (30+ days in analysis window).
             Average daily cost: $0.25. Consider deleting if no longer needed for compliance.
Priority: low (estimated $7.50/month savings)
```

### 5. RESERVED_INSTANCE

**Detection Logic:**
- Instances with consistent 24/7 usage for 28+ days
- On-demand instances (not already Reserved)
- Average daily cost >$1 (meaningful workload)

**Estimated Savings:**
- 35% of on-demand monthly cost (1-year RI savings)

**Example:**
```
Title: Reserved Instance Opportunity: i-5555555555
Description: This EC2 instance has run consistently for 29 days with average daily cost of $4.80.
             Consider purchasing a 1-year Reserved Instance to save approximately 35%.
             Monthly on-demand cost: $144.
Priority: high (estimated $50.40/month savings)
```

## Priority Calculation

Recommendations are prioritized based on estimated monthly savings:

| Priority | Monthly Savings |
|----------|----------------|
| **High** | ≥ $500         |
| **Medium** | $100 - $499   |
| **Low** | < $100         |

## Usage

### Basic Usage

```typescript
import { PrismaClient } from '@prisma/client';
import { RecommendationGeneratorService } from './recommendation-generator.service';
import { eventBus } from '../../../shared/events/event-bus';

const prisma = new PrismaClient();
const service = new RecommendationGeneratorService(prisma, eventBus);

// Generate recommendations for all tenant accounts
const result = await service.generateRecommendations('tenant-id-123');

console.log(`Generated ${result.recommendationsGenerated} recommendations`);
console.log(`Estimated monthly savings: $${result.totalEstimatedSavings}`);
```

### Query Recommendations

```typescript
// Get high-priority recommendations
const highPriorityRecs = await service.getRecommendations('tenant-id-123', {
  priority: 'high',
  status: 'open',
});

// Get AWS-specific recommendations
const awsRecs = await service.getRecommendations('tenant-id-123', {
  provider: 'AWS',
  status: 'open',
});

// Get total estimated savings
const totalSavings = await service.getTotalEstimatedSavings('tenant-id-123');
```

### Update Recommendation Status

```typescript
// Mark as applied
await service.updateRecommendationStatus(
  'recommendation-id',
  'applied',
  new Date()
);

// Dismiss recommendation
await service.updateRecommendationStatus(
  'recommendation-id',
  'dismissed'
);
```

### Subscribe to Events

```typescript
eventBus.on('recommendation.generated', (data) => {
  console.log(`New recommendation: ${data.type}`);
  console.log(`Estimated savings: $${data.estimatedSavings}/month`);

  // Trigger downstream actions:
  // - Send email notification
  // - Create incident ticket
  // - Update dashboard
  // - Send Slack alert
});
```

## Configuration

### Analysis Parameters

```typescript
// Analysis window for cost patterns
private static readonly ANALYSIS_WINDOW_DAYS = 30;

// Idle resource detection threshold
private static readonly IDLE_THRESHOLD_PERCENT = 0.05;  // 5% of expected cost

// Minimum days for idle detection
private static readonly IDLE_MIN_DAYS = 25;

// Snapshot age threshold
private static readonly SNAPSHOT_AGE_THRESHOLD_DAYS = 90;

// Reserved Instance consistency requirement
private static readonly RI_MIN_CONSISTENT_DAYS = 28;

// Reserved Instance savings estimate
private static readonly RI_SAVINGS_PERCENT = 0.35;  // 35%
```

### Pricing Estimates

The service includes simplified pricing estimates for common instance types:

**AWS EC2 (us-east-1):**
- t3.nano: $0.0052/hr
- t3.micro: $0.0104/hr
- t3.small: $0.0208/hr
- t3.medium: $0.0416/hr
- t3.large: $0.0832/hr
- m5.large: $0.096/hr
- m5.xlarge: $0.192/hr

**Azure VMs (East US):**
- Standard_B1s: $0.0104/hr
- Standard_B2s: $0.0416/hr
- Standard_B2ms: $0.0832/hr
- Standard_D2s_v3: $0.096/hr
- Standard_D4s_v3: $0.192/hr

**Storage Pricing:**
- AWS EBS GP3: $0.08/GB-month
- AWS Snapshot: $0.05/GB-month
- Azure Managed Disk: $0.10/GB-month
- Azure Snapshot: $0.05/GB-month

## Workflow

1. **Retrieve Cloud Accounts**
   - Query active cloud accounts for tenant
   - Filter by specific account if provided

2. **Analyze Each Account**
   - Get cost data for last 30 days
   - Run provider-specific detection algorithms
   - Calculate estimated savings and priority

3. **Deduplication**
   - Check for existing open recommendations
   - Update if savings changed significantly (>10%)
   - Create new recommendations if not duplicate

4. **Persistence**
   - Save recommendations to database
   - Track creation timestamp

5. **Event Emission**
   - Emit `recommendation.generated` event
   - Include all relevant metadata

6. **Return Results**
   - Total recommendations generated
   - Breakdown by type
   - Total estimated savings
   - Execution time
   - Any errors encountered

## Error Handling

The service implements comprehensive error handling:

- **Account-Level Errors**: Logged and added to error array, processing continues for other accounts
- **Recommendation-Level Errors**: Logged individually, other recommendations still saved
- **Partial Success**: Returns success=true even if some accounts failed
- **Error Context**: All errors include detailed context for debugging

```typescript
{
  success: true,
  recommendationsGenerated: 15,
  totalEstimatedSavings: 1250.50,
  errors: [
    'Failed to analyze account prod-aws-1: Connection timeout',
    'Failed to analyze account dev-azure-2: Invalid credentials'
  ]
}
```

## Performance Considerations

- **Analysis Window**: 30-day rolling window balances accuracy with database query performance
- **Batch Processing**: Analyzes multiple cloud accounts sequentially
- **Async Operations**: Uses Promise.all for parallel detection algorithms within each account
- **Indexed Queries**: Leverages database indexes on tenantId, date, provider, service
- **Deduplication**: Single query per recommendation to check for duplicates

## Database Schema

The service interacts with two primary tables:

### cost_data
```sql
- date: Date of cost record
- amount: Cost amount (Decimal)
- provider: 'AWS' | 'AZURE'
- service: Cloud service name
- usageType: Type of usage
- assetId: Link to asset/resource
- metadata: Additional metadata (JSON)
```

### cost_recommendations
```sql
- id: UUID
- tenantId: Tenant reference
- type: Recommendation type
- priority: 'high' | 'medium' | 'low'
- provider: 'AWS' | 'AZURE'
- service: Cloud service
- resourceId: Resource identifier
- title: Recommendation title
- description: Detailed description
- estimatedSavings: Monthly savings (Decimal)
- savingsPeriod: 'monthly' | 'yearly'
- status: 'open' | 'applied' | 'dismissed'
- actionable: Boolean
- actionScript: Optional automation script
- createdAt: Timestamp
- appliedAt: Optional application timestamp
```

## Event Schema

### recommendation.generated

```typescript
{
  tenantId: string;
  recommendationId: string;
  type: 'idle_resource' | 'rightsize' | 'unused_resource' | 'delete_snapshot' | 'reserved_instance';
  estimatedSavings: number;
  priority: 'high' | 'medium' | 'low';
  provider: 'AWS' | 'AZURE';
  service: string;
  resourceId: string;
}
```

## Testing Strategy

### Unit Tests
- Test each detection algorithm with mock cost data
- Test priority calculation logic
- Test deduplication logic
- Test instance type downsizing logic

### Integration Tests
- Test end-to-end recommendation generation
- Test database persistence
- Test event emission
- Test error handling with invalid data

### Performance Tests
- Test with large datasets (1000+ cost records)
- Test with multiple cloud accounts (10+ accounts)
- Measure execution time and memory usage

## Future Enhancements

1. **Machine Learning Integration**
   - Use historical patterns for more accurate predictions
   - Anomaly-based recommendation generation
   - Seasonal usage pattern detection

2. **Auto-Remediation**
   - Implement actionable recommendation execution
   - Approval workflow for automated actions
   - Rollback capabilities

3. **Additional Recommendation Types**
   - Spot instance opportunities
   - Storage class optimization
   - Network transfer optimization
   - Database rightsizing

4. **Enhanced Pricing**
   - Real-time pricing API integration
   - Region-specific pricing
   - Commitment discount calculations

5. **Recommendation Confidence Scores**
   - Statistical confidence levels
   - Risk assessment for each recommendation
   - Impact analysis

## Integration Points

### Upstream Dependencies
- **PrismaClient**: Database access
- **EventBus**: Event emission
- **cost_data table**: Historical cost data
- **cloud_accounts table**: Account credentials

### Downstream Consumers
- **Dashboard Module**: Display recommendations
- **Incidents Module**: Create incidents for high-priority recommendations
- **Notifications Module**: Alert users of new recommendations
- **Reports Module**: Include in cost optimization reports

## Maintenance

### Regular Updates
- Update pricing data quarterly
- Review detection thresholds based on false positive rates
- Add support for new instance types
- Refine detection algorithms based on user feedback

### Monitoring
- Track recommendation acceptance rate
- Monitor false positive rate
- Track actual savings realized
- Monitor execution time and performance

## Support

For questions or issues, contact the FinOps team or refer to:
- Service source code: `recommendation-generator.service.ts`
- Usage examples: `recommendation-generator.example.ts`
- API documentation: `../API_EXAMPLES.md`
