# FinOps Controllers

## Overview

This directory contains HTTP controllers for the FinOps (Financial Operations) module, which provides REST API endpoints for cloud cost management and anomaly detection.

## Files

### `costs.controller.ts` (765 lines)

Main controller implementing all FinOps endpoints.

**Features**:
- Input validation using Zod schemas
- Tenant isolation via JWT authentication
- Comprehensive error handling
- TypeScript strict mode compliance
- Extensive JSDoc documentation

**Endpoints Implemented**: 5 total

#### Cost Data Endpoints (3)
1. `GET /api/finops/costs` - Retrieve cost data with filters
2. `GET /api/finops/costs/by-service` - Cost aggregation by service
3. `GET /api/finops/costs/trends` - Cost trends with configurable granularity

#### Anomaly Endpoints (2)
4. `GET /api/finops/anomalies` - Retrieve anomalies with filters
5. `POST /api/finops/anomalies/:id/resolve` - Mark anomaly as resolved

## Architecture

### Input Validation
All endpoints use Zod schemas for type-safe input validation:
- `getCostsSchema` - Validates date range and filters
- `getCostsByServiceSchema` - Validates aggregation parameters
- `getTrendsSchema` - Validates trend analysis parameters with granularity
- `getAnomaliesSchema` - Validates anomaly filters
- `resolveAnomalySchema` - Validates resolution data

### Authentication
Uses `AuthenticatedRequest` interface extending Express Request:
```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}
```

### Error Handling
Centralized error handling via `handleError()` method:
- Zod validation errors → 400 Bad Request
- Authentication errors → 401 Unauthorized
- Authorization errors → 403 Forbidden
- Not found errors → 404 Not Found
- Internal errors → 500 Internal Server Error

### Data Aggregation
Implements efficient database queries:
- **groupBy**: Service-level aggregation
- **Date filtering**: Time-range queries
- **Trend aggregation**: Daily/Weekly/Monthly grouping

## Dependencies

### External
- `express` - Web framework
- `@prisma/client` - Database ORM
- `zod` - Schema validation
- `events` - Event-driven architecture

### Internal
- `AnomalyDetectionService` - Business logic for anomaly detection
- Prisma models: `CostData`, `CostAnomaly`, `Tenant`

## Usage Example

```typescript
import { costsController } from './costs.controller';
import { Router } from 'express';

const router = Router();

// Bind controller methods to routes
router.get('/costs', costsController.getCosts.bind(costsController));
router.get('/costs/by-service', costsController.getCostsByService.bind(costsController));
router.get('/costs/trends', costsController.getCostTrends.bind(costsController));
router.get('/anomalies', costsController.getAnomalies.bind(costsController));
router.post('/anomalies/:id/resolve', costsController.resolveAnomaly.bind(costsController));

export default router;
```

## Testing

See Task 2.7 for comprehensive integration tests covering:
- Input validation
- Authentication/Authorization
- Business logic
- Error scenarios
- Edge cases

## Performance Considerations

### Database Queries
- Indexed fields used in WHERE clauses (`tenantId`, `date`, `provider`, `service`)
- Efficient groupBy for aggregations
- Date range queries optimized with compound indexes

### Response Optimization
- Decimal to Number conversion for JSON serialization
- Date formatting to ISO 8601 strings
- Rounding for currency values (2 decimal places)

### Memory Management
- Streaming not required (cost data is reasonably sized)
- Efficient data transformations using map/reduce
- No memory leaks in async handlers

## Security

### Input Sanitization
- All inputs validated with Zod before database queries
- SQL injection prevented by Prisma parameterized queries
- XSS protection via JSON responses (no HTML rendering)

### Authentication & Authorization
- JWT token verification on all routes
- Tenant isolation enforced via `tenantId` filtering
- User identity verification for anomaly resolution

### Data Privacy
- Multi-tenant data isolation
- No cross-tenant data leakage
- Sensitive fields not exposed in responses

## Monitoring & Logging

All methods include comprehensive logging:
```typescript
console.log(`[CostsController] getCosts - Tenant: ${tenantId}, DateRange: ...`);
console.log(`[CostsController] getCosts - Retrieved ${costs.length} cost records`);
```

**Log Levels**:
- INFO: Request details, query results, success operations
- ERROR: Validation errors, database errors, exceptions

**Log Prefixes**:
- `[CostsController]` - All controller logs
- Method name included for traceability

## Future Enhancements

1. **Pagination**: Add limit/offset for large datasets
2. **Caching**: Redis cache for frequently accessed data
3. **Export**: CSV/Excel export functionality
4. **Filtering**: Advanced filters (tags, regions, accounts)
5. **Sorting**: Configurable sort order
6. **Aggregation**: More aggregation types (by region, account, tag)
7. **Real-time**: WebSocket support for live updates
8. **Analytics**: Advanced analytics and forecasting

## Maintenance

### Adding New Endpoints
1. Create Zod validation schema
2. Implement controller method with proper typing
3. Add comprehensive error handling
4. Include logging statements
5. Document with JSDoc
6. Register route in routes/index.ts

### Modifying Existing Endpoints
1. Update Zod schema if input changes
2. Update response type if output changes
3. Update JSDoc documentation
4. Update integration tests
5. Update API documentation

## Support

For questions or issues:
- Review INTEGRATION.md for setup instructions
- Check Prisma schema for data models
- Consult service layer documentation
- Contact development team
