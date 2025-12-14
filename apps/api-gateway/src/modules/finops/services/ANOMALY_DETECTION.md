# Cost Anomaly Detection Service

## Overview

The Cost Anomaly Detection Service analyzes cloud cost data to identify unusual spending patterns by comparing current costs against historical baselines. This service is a critical component of the FinOps module, helping organizations detect and respond to unexpected cost increases before they become significant financial issues.

## Key Features

- **Statistical Anomaly Detection**: Compares current costs vs. 30-day historical average
- **Service-Level Granularity**: Detects anomalies at the cloud service level (EC2, RDS, S3, etc.)
- **Severity Classification**: Automatically categorizes anomalies by severity (low, medium, high, critical)
- **Duplicate Prevention**: Ensures only one anomaly per service/date combination
- **Event-Driven Architecture**: Emits events for downstream processing (incident creation, alerts)
- **Flexible Filtering**: Query anomalies by status, severity, date range, provider, or service

## Algorithm Details

### Detection Workflow

```
1. Retrieve costs for analysis date, grouped by service
2. For each service:
   a. Calculate historical average (last 30 days, excluding analysis date)
   b. Calculate deviation percentage: ((actual - expected) / expected) × 100
   c. If |deviation| > 50%, create anomaly record
   d. Calculate severity based on deviation magnitude
   e. Emit cost.anomaly.detected event
3. Return list of detected anomalies
```

### Deviation Calculation

```typescript
const historicalAvg = calculateAverage(last30Days);
const currentCost = todaysCost;
const deviation = ((currentCost - historicalAvg) / historicalAvg) * 100;

// Example:
// Historical average: $100/day
// Current cost: $250/day
// Deviation: ((250 - 100) / 100) × 100 = 150%
```

### Threshold & Severity

| Deviation Range | Severity | Example |
|----------------|----------|---------|
| 50-100% | Low | $100 → $150-200 |
| 100-200% | Medium | $100 → $200-300 |
| 200-500% | High | $100 → $300-600 |
| >500% | Critical | $100 → $600+ |

**Note**: Absolute deviation is used, so both increases and decreases are detected.

### Historical Baseline

- **Lookback Period**: 30 days
- **Exclusions**: Current analysis date is excluded to prevent bias
- **Edge Case**: If no historical data exists, skip service (prevents false positives on new services)

## Architecture Decisions

### 1. Why 30-Day Historical Average?

**Decision**: Use 30-day rolling average instead of week-over-week comparison.

**Rationale**:
- Captures seasonal patterns (monthly billing cycles, month-end spikes)
- More stable than weekly averages (less noise)
- Standard industry practice for cloud cost anomaly detection
- Balances recency vs. statistical significance

**Trade-offs**:
- New services need 30 days before anomalies can be detected
- Gradual increases may not be detected immediately
- Monthly spikes might be flagged if they don't occur at same time each month

### 2. Why 50% Deviation Threshold?

**Decision**: Use 50% absolute deviation as the anomaly trigger threshold.

**Rationale**:
- Filters out normal variance (cloud costs naturally fluctuate 10-30%)
- Focuses on actionable anomalies (50%+ change is significant)
- Reduces alert fatigue from minor fluctuations
- Aligns with AWS Cost Anomaly Detection defaults

**Trade-offs**:
- May miss gradual cost increases (40% increase wouldn't trigger)
- Very expensive services might have natural variance >50%

### 3. Why Service-Level Granularity?

**Decision**: Detect anomalies at the service level (EC2, RDS, etc.) rather than account-level.

**Rationale**:
- More actionable (identifies specific problem area)
- Prevents large services from masking small service anomalies
- Enables targeted investigation and remediation
- Standard practice in cloud cost management

**Trade-offs**:
- More anomalies to process (one per service vs. one per account)
- Requires more database storage
- More complex analysis

### 4. Why No cloudAccountId in CostAnomaly Model?

**Decision**: Store anomalies at tenant level without direct cloud account reference.

**Rationale** (Based on existing schema):
- Simplifies anomaly aggregation across multiple cloud accounts
- Tenant is the primary isolation boundary
- Cloud account information still accessible via cost data queries
- Reduces schema complexity

**Impact on Implementation**:
- Cannot filter anomalies by cloud account directly
- Must use provider/service filters instead
- Analysis still operates per cloud account, but storage is tenant-level

### 5. Why Duplicate Prevention?

**Decision**: Prevent creating duplicate anomalies for same service/date/tenant.

**Rationale**:
- Analysis may run multiple times per day (retries, manual triggers)
- Prevents alert spam to users
- Maintains data integrity
- Simplifies reporting (one anomaly = one occurrence)

**Implementation**:
- Check for existing anomaly before creation
- Unique constraint: [tenantId, provider, service, date]
- Returns null if duplicate detected (idempotent operation)

## Usage Examples

### Basic Analysis

```typescript
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/event-bus';
import { AnomalyDetectionService } from './anomaly-detection.service';

const prisma = new PrismaClient();
const service = new AnomalyDetectionService(prisma, eventBus);

// Analyze yesterday's costs (default)
const result = await service.analyzeRecentCosts(
  'tenant-id-123',
  'cloud-account-id-456'
);

console.log(`Detected ${result.anomaliesDetected} anomalies`);
```

### Query Anomalies

```typescript
// Get all open critical anomalies
const criticalAnomalies = await service.getAnomaliesForTenant('tenant-123', {
  status: 'open',
  severity: 'critical'
});

// Get anomalies for last 30 days
const recentAnomalies = await service.getAnomaliesForTenant('tenant-123', {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
});
```

### Event Handling

```typescript
// Subscribe to anomaly events
eventBus.onCostAnomalyDetected(async (data) => {
  console.log(`Anomaly detected: ${data.service} - ${data.severity}`);

  // Create incident
  // Send alert
  // Log to monitoring system
});
```

## Integration Points

### 1. Cost Collection Service

**Flow**: CostCollectionService → AnomalyDetectionService

```typescript
// After collecting costs, trigger anomaly detection
const collectionResult = await costCollectionService.collectCostsForAccount(...);
const anomalyResult = await anomalyDetectionService.analyzeRecentCosts(...);
```

### 2. Incident Management (Future)

**Flow**: AnomalyDetectionService → IncidentService (via events)

```typescript
eventBus.onCostAnomalyDetected(async (data) => {
  if (data.severity === 'critical' || data.severity === 'high') {
    await incidentService.createIncident({
      title: `Cost anomaly: ${data.service}`,
      severity: data.severity,
      source: 'cost_anomaly',
      sourceId: data.anomalyId,
      // ...
    });
  }
});
```

### 3. Alert Notifications (Future)

**Flow**: AnomalyDetectionService → NotificationService (via events)

```typescript
eventBus.onCostAnomalyDetected(async (data) => {
  await notificationService.sendAlert({
    type: 'cost_anomaly',
    severity: data.severity,
    tenantId: data.tenantId,
    message: `Unexpected ${data.service} cost: $${data.actualCost} (expected $${data.expectedCost})`
  });
});
```

## Performance Considerations

### Database Queries

1. **getCostsForDate**: Uses Prisma groupBy (efficient aggregation)
2. **getHistoricalAverage**: Date range query with index on `date` column
3. **Duplicate Check**: findFirst with compound where clause (fast lookup)

### Optimization Tips

- **Batch Processing**: Analyze multiple accounts in parallel
- **Incremental Analysis**: Only analyze days with new cost data
- **Caching**: Cache historical averages if running multiple times per day
- **Index Usage**: Ensure indexes on [tenantId, cloudAccountId, date, service]

## Testing Strategy

### Unit Tests (Task 2.7)

- Test deviation calculation with known values
- Test severity classification thresholds
- Test historical average calculation
- Test duplicate prevention
- Test edge cases (no historical data, zero costs)

### Integration Tests (Task 2.7)

- Test full analysis workflow with real database
- Test event emission
- Test filtering and querying
- Test with multiple cloud accounts

### Performance Tests

- Test with large datasets (1M+ cost records)
- Test analysis runtime for 100+ cloud accounts
- Test concurrent analysis operations

## Monitoring & Observability

### Metrics to Track

- Number of anomalies detected per day
- Analysis execution time
- False positive rate (user feedback)
- Severity distribution
- Service coverage (% of services analyzed)

### Logging

All major operations are logged with `[AnomalyDetection]` prefix:

```
[AnomalyDetection] Analyzing costs for 2024-01-15
[AnomalyDetection] Retrieved 15 services with cost data
[AnomalyDetection] Analyzing service: EC2 ($250.00)
[AnomalyDetection] Historical average for EC2: $100.00
[AnomalyDetection] Deviation: 150.00%
[AnomalyDetection] Anomaly detected! Deviation exceeds 50%
[AnomalyDetection] Creating medium anomaly for EC2: $250.00 (expected $100.00)
[AnomalyDetection] Created anomaly record with ID: anomaly-xyz
[AnomalyDetection] Emitted cost.anomaly.detected event
```

## Future Enhancements

### Phase 2 Improvements

1. **Machine Learning Models**
   - Replace simple statistical detection with ML models
   - Predict expected costs more accurately
   - Reduce false positives

2. **Root Cause Analysis**
   - Automatically identify which resources caused the anomaly
   - Populate `rootCause` field in database
   - Link to specific assets

3. **Trend Analysis**
   - Detect gradual increases (cost drift)
   - Identify seasonal patterns
   - Forecast future costs

4. **Multi-Dimensional Analysis**
   - Analyze by region, availability zone, tags
   - Cross-service correlation
   - Account-level aggregation

5. **Smart Thresholds**
   - Service-specific thresholds (EC2 vs. S3)
   - Tenant-specific sensitivity settings
   - Cost-based thresholds (absolute $ amounts)

## References

- [AWS Cost Anomaly Detection](https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/)
- [Azure Cost Anomaly Detection](https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges)
- [FinOps Foundation: Anomaly Management](https://www.finops.org/framework/capabilities/anomaly-management/)
