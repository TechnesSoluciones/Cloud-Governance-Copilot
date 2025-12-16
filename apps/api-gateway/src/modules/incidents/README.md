# Incidents Module

## Overview

The Incidents module provides comprehensive incident management capabilities for the Cloud Governance Copilot platform. It integrates with Azure Monitor to collect, correlate, and manage incidents across your Azure infrastructure.

## Architecture

```
incidents/
├── dto/                    # Data Transfer Objects
│   ├── alert.dto.ts
│   ├── activity-log.dto.ts
│   ├── incident.dto.ts
│   └── index.ts
├── services/               # Business Logic
│   └── incidents.service.ts
├── controllers/            # HTTP Request Handlers
│   └── incidents.controller.ts
├── routes/                 # API Route Definitions
│   ├── incidents.routes.ts
│   └── index.ts
└── README.md
```

## Features

### Alert Management
- Fetch alerts from Azure Monitor
- Filter by severity, status, resource type, and time range
- Store alerts in database for historical tracking
- Support for pagination

### Activity Log Management
- Retrieve Azure Activity Logs
- Advanced filtering (operation, status, level, caller)
- Correlation with incidents
- Time-range queries with pagination limit (max 1000)

### Incident Management
- Automatic alert aggregation into incidents
- Incident lifecycle management (new → acknowledged → investigating → resolved → closed)
- Resource correlation
- Timeline generation
- Comment system
- Assignment management

### Metrics Collection
- Real-time resource metrics from Azure Monitor
- Support for multiple metric types (CPU, Memory, Network, Disk)
- Configurable aggregation and intervals
- Time-series data

### Caching
- 5-minute TTL for active incidents
- Cache invalidation on updates
- Improves performance for frequently accessed data

## Usage

### Service Layer

```typescript
import { IncidentsService } from './services/incidents.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const incidentsService = new IncidentsService(prisma);

// Get alerts
const alerts = await incidentsService.getAlerts(
  accountId,
  credentials,
  {
    severity: ['critical', 'high'],
    status: ['active'],
    timeRange: {
      start: new Date(Date.now() - 86400000),
      end: new Date(),
    },
  }
);

// Get activity logs
const logs = await incidentsService.getActivityLogs(
  accountId,
  credentials,
  {
    timeRange: {
      start: new Date(Date.now() - 86400000),
      end: new Date(),
    },
    status: ['Failed'],
    level: ['Error', 'Critical'],
  }
);

// Create incident
const incident = await incidentsService.createIncident({
  tenantId: 'tenant-uuid',
  accountId: 'account-uuid',
  title: 'High CPU Usage Alert',
  description: 'Multiple VMs experiencing high CPU usage',
  severity: 'critical',
  affectedResources: ['/subscriptions/.../vm1', '/subscriptions/.../vm2'],
  alertIds: ['alert-1', 'alert-2'],
});

// Update incident status
const updated = await incidentsService.updateIncidentStatus(
  tenantId,
  incidentId,
  {
    status: 'acknowledged',
    notes: 'Team notified, investigating',
    assignedTo: 'user-uuid',
  }
);

// Add comment
const comment = await incidentsService.addComment(incidentId, {
  comment: 'Root cause identified',
  userId: 'user-uuid',
});

// Aggregate alerts into incidents
const incidents = await incidentsService.aggregateAlertsIntoIncidents(
  tenantId,
  accountId,
  alerts
);
```

### API Endpoints

See [INCIDENT_MANAGEMENT_API.md](../../../docs/INCIDENT_MANAGEMENT_API.md) for complete API documentation.

**Base URL:** `/api/v1/incidents`

**Endpoints:**
- `GET /alerts` - List alerts
- `GET /activity-logs` - List activity logs
- `GET /` - List incidents
- `GET /:id` - Get incident details
- `PATCH /:id/status` - Update incident status
- `POST /:id/comments` - Add comment
- `GET /metrics/:resourceId` - Get resource metrics

## Database Schema

### azure_alerts

Stores alerts from Azure Monitor.

```sql
CREATE TABLE azure_alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  alert_id VARCHAR(500) NOT NULL UNIQUE,
  alert_name VARCHAR(500) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  resource_id VARCHAR(500),
  resource_type VARCHAR(255),
  description TEXT,
  fired_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### azure_activity_logs

Stores Azure Activity Logs for operational insights.

```sql
CREATE TABLE azure_activity_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  operation_name VARCHAR(500),
  operation_id VARCHAR(255),
  status VARCHAR(100),
  caller VARCHAR(255),
  resource_id VARCHAR(500),
  resource_type VARCHAR(255),
  event_timestamp TIMESTAMP WITH TIME ZONE,
  level VARCHAR(50),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### incidents

Enhanced incidents table with Azure-specific fields.

```sql
ALTER TABLE incidents ADD COLUMN account_id VARCHAR(255);
ALTER TABLE incidents ADD COLUMN affected_resources TEXT[];
ALTER TABLE incidents ADD COLUMN alert_ids TEXT[];
ALTER TABLE incidents ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incidents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
```

### incident_comments

Stores comments and notes for incidents.

```sql
CREATE TABLE incident_comments (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Migration

Apply the database migration:

```bash
# Development
npm run prisma:migrate

# Production
npm run prisma:deploy
```

Migration file: `prisma/migrations/20251215_incident_management/migration.sql`

## Configuration

### Rate Limiting

The API implements rate limiting: **30 requests per 15 minutes**

This is configured in `routes/incidents.routes.ts`:

```typescript
const incidentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests
});
```

### Caching

Cache TTL is set to **5 minutes** for active incidents:

```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

### Azure Monitor Integration

The module uses the following Azure SDKs:
- `@azure/monitor-query` - For metrics and log queries
- `@azure/arm-monitor` - For alerts and activity logs (via MonitorClient)

Ensure credentials include:
- `azureClientId`
- `azureClientSecret`
- `azureTenantId`
- `azureSubscriptionId`

## Error Handling

All service methods throw descriptive errors:

```typescript
try {
  const incident = await incidentsService.getIncidentById(tenantId, incidentId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle 404
  } else {
    // Handle other errors
  }
}
```

Controllers catch these errors and return appropriate HTTP status codes:
- 400 - Bad Request (missing parameters, invalid input)
- 401 - Unauthorized (missing/invalid auth)
- 404 - Not Found (incident/resource not found)
- 429 - Too Many Requests (rate limit exceeded)
- 500 - Internal Server Error (unexpected errors)

## Testing

### Unit Tests

```bash
npm run test:unit
```

Test files should be placed in `__tests__/` directory:
- `incidents.service.test.ts`
- `incidents.controller.test.ts`

### Integration Tests

```bash
npm run test:integration
```

Test Azure Monitor integration with mock credentials.

## Performance Considerations

### Pagination

- **Alerts:** Max 100 per page
- **Activity Logs:** Max 1000 per page (Azure limit)
- **Incidents:** Max 50 per page

### Caching Strategy

- Active incidents are cached for 5 minutes
- Cache is invalidated on updates
- Cache key includes filters for accurate results

### Database Indexes

The migration creates optimized indexes:

```sql
-- Alert indexes
CREATE INDEX idx_alerts_tenant_account ON azure_alerts(tenant_id, account_id);
CREATE INDEX idx_alerts_severity ON azure_alerts(severity);
CREATE INDEX idx_alerts_status ON azure_alerts(status);
CREATE INDEX idx_alerts_fired_at ON azure_alerts(fired_at DESC);

-- Activity log indexes
CREATE INDEX idx_activity_logs_timestamp ON azure_activity_logs(event_timestamp DESC);
CREATE INDEX idx_activity_logs_status ON azure_activity_logs(status);

-- Incident indexes
CREATE INDEX idx_incidents_tenant_account ON incidents(tenant_id, account_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
```

## Security

### Authentication

All endpoints require JWT authentication with:
- `userId` claim
- `tenantId` claim

The middleware populates `req.user` with these values.

### Authorization

- Incidents are scoped to tenant
- Users can only access incidents for their tenant
- Activity logs and alerts require valid cloud account credentials

### Credential Encryption

Cloud account credentials are encrypted at rest using AES-256-GCM:

```typescript
const credentials = await decryptCloudCredentials(
  account.credentials_ciphertext,
  account.credentials_iv,
  account.credentials_auth_tag
);
```

## Monitoring

### Logging

The service logs key operations:

```
[IncidentsService] Retrieved 15 alerts for account {accountId}
[IncidentsService] Stored 15 alerts for tenant {tenantId}
[IncidentsService] Created incident {incidentId}
[IncidentsService] Updated incident {incidentId} status to {status}
[IncidentsService] Aggregated 20 alerts into 5 incidents
```

### Metrics

Track these metrics for production monitoring:
- Alert retrieval latency
- Incident creation rate
- Cache hit rate
- API error rate
- Rate limit hits

## Future Enhancements

### Phase 2 Features

1. **Webhook Support** - Real-time alert notifications
2. **AI-Powered Root Cause Analysis** - Automated incident diagnosis
3. **Incident Playbooks** - Automated remediation workflows
4. **SLA Tracking** - Time-to-acknowledge, time-to-resolve metrics
5. **Multi-Cloud Support** - AWS CloudWatch, GCP Monitoring
6. **Notification Integrations** - Slack, PagerDuty, Microsoft Teams
7. **Advanced Correlation** - ML-based incident grouping
8. **Custom Alert Rules** - User-defined alert conditions

### Planned Optimizations

- [ ] Implement background job for alert aggregation
- [ ] Add Redis cache layer for distributed caching
- [ ] Implement event streaming for real-time updates
- [ ] Add GraphQL API for flexible queries
- [ ] Implement alert suppression rules
- [ ] Add incident templates

## Contributing

When contributing to this module:

1. Follow TypeScript best practices
2. Add JSDoc comments to all public methods
3. Include error handling
4. Write unit tests for new features
5. Update API documentation
6. Use the existing DTO patterns
7. Maintain backward compatibility

## License

Proprietary - Cloud Governance Copilot

---

**Version:** 1.0.0
**Last Updated:** 2025-12-15
