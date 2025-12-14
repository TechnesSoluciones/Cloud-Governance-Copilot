# FinOps Module Integration Guide

## Overview

This guide explains how to integrate the FinOps module routes into the main API Gateway application.

## Files Created

### 1. Controller: `src/modules/finops/controllers/costs.controller.ts`
- **Purpose**: Handles all HTTP requests for cost data and anomaly management
- **Endpoints**: 5 REST endpoints (3 for costs, 2 for anomalies)
- **Dependencies**: Prisma, Zod, AnomalyDetectionService

### 2. Routes: `src/modules/finops/routes/index.ts`
- **Purpose**: Defines Express routes and applies middleware
- **Middleware**: Authentication, Rate Limiting
- **Mount Path**: `/api/finops` (or `/api/v1/finops`)

## Integration Steps

### Step 1: Update `src/index.ts`

Add the following import at the top of the file:

```typescript
import finopsRoutes from './modules/finops/routes';
```

Then, add the route registration after the existing routes (around line 77):

```typescript
// FinOps routes
app.use('/api/v1/finops', finopsRoutes);
```

**Complete Example:**

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import cloudAccountRoutes from './routes/cloudAccount.routes';
import finopsRoutes from './modules/finops/routes'; // <-- ADD THIS
import { initRedis, closeRedis } from './config/redis';

// ... rest of the code ...

// Auth routes
app.use('/api/v1/auth', authRoutes);

// User routes
app.use('/api/v1/users', userRoutes);

// Cloud Account routes
app.use('/api/v1/cloud-accounts', cloudAccountRoutes);

// FinOps routes (NEW)
app.use('/api/v1/finops', finopsRoutes); // <-- ADD THIS

// Error Handling
app.use(errorHandler);
```

### Step 2: Update API Documentation Response (Optional)

Update the root API endpoint to include FinOps endpoints:

```typescript
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Cloud Governance Copilot API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      tenants: '/api/v1/tenants',
      users: '/api/v1/users',
      cloudAccounts: '/api/v1/cloud-accounts',
      finops: '/api/v1/finops', // <-- ADD THIS
    },
  });
});
```

### Step 3: Verify Authentication Middleware

The routes use the `authenticate` middleware from `src/middleware/auth.ts`. Ensure this middleware:

1. Verifies JWT tokens
2. Extracts `userId`, `email`, `tenantId`, and `role` from the token
3. Attaches them to `req.user`

**Expected Structure:**

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        tenantId: string;
        role: string;
      };
    }
  }
}
```

The existing middleware at `src/middleware/auth.ts` already does this correctly.

## API Endpoints

### Cost Data Endpoints

#### 1. GET `/api/v1/finops/costs`

**Description**: Retrieve cost data with filters

**Query Parameters**:
- `startDate` (required): ISO 8601 date string (e.g., `2024-01-01T00:00:00Z`)
- `endDate` (required): ISO 8601 date string
- `provider` (optional): `aws` | `azure` | `gcp`
- `service` (optional): Service name (e.g., `Amazon EC2`)

**Headers**:
- `Authorization: Bearer <jwt-token>`

**Example Request**:
```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "service": "Amazon EC2",
      "provider": "aws",
      "amount": 150.50,
      "currency": "USD"
    }
  ],
  "total": 2500.00,
  "currency": "USD"
}
```

---

#### 2. GET `/api/v1/finops/costs/by-service`

**Description**: Get cost aggregation by service with percentage breakdown

**Query Parameters**:
- `startDate` (required): ISO 8601 date string
- `endDate` (required): ISO 8601 date string
- `provider` (optional): `aws` | `azure` | `gcp`

**Example Request**:
```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "service": "Amazon EC2",
      "provider": "aws",
      "totalCost": 1500.00,
      "percentage": 60.0
    },
    {
      "service": "Amazon RDS",
      "provider": "aws",
      "totalCost": 750.00,
      "percentage": 30.0
    }
  ]
}
```

---

#### 3. GET `/api/v1/finops/costs/trends`

**Description**: Get cost trends over time with configurable granularity

**Query Parameters**:
- `startDate` (required): ISO 8601 date string
- `endDate` (required): ISO 8601 date string
- `granularity` (optional): `daily` | `weekly` | `monthly` (default: `daily`)

**Example Request**:
```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-W01",
      "totalCost": 550.00,
      "currency": "USD"
    },
    {
      "date": "2024-W02",
      "totalCost": 625.00,
      "currency": "USD"
    }
  ]
}
```

---

### Anomaly Endpoints

#### 4. GET `/api/v1/finops/anomalies`

**Description**: Retrieve cost anomalies with filters

**Query Parameters** (all optional):
- `status`: `open` | `investigating` | `resolved` | `dismissed`
- `severity`: `low` | `medium` | `high` | `critical`
- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `provider`: `aws` | `azure` | `gcp`
- `service`: Service name

**Example Request**:
```bash
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?status=open&severity=critical" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15",
      "service": "Amazon EC2",
      "provider": "aws",
      "severity": "critical",
      "status": "open",
      "expectedCost": 100.00,
      "actualCost": 650.00,
      "deviation": 550.0,
      "detectedAt": "2024-01-16T02:00:00Z",
      "resourceId": "i-1234567890abcdef0",
      "rootCause": null,
      "resolvedAt": null,
      "resolvedBy": null
    }
  ],
  "count": 1
}
```

---

#### 5. POST `/api/v1/finops/anomalies/:id/resolve`

**Description**: Mark an anomaly as resolved

**URL Parameters**:
- `id`: Anomaly UUID

**Request Body**:
```json
{
  "resolution": "False positive - planned deployment for scaling event",
  "resolvedBy": "550e8400-e29b-41d4-a716-446655440001" // Optional, defaults to authenticated user
}
```

**Example Request**:
```bash
curl -X POST "http://localhost:4000/api/v1/finops/anomalies/550e8400-e29b-41d4-a716-446655440000/resolve" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "False positive - planned deployment"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "resolved",
    "rootCause": {
      "type": "manual_resolution",
      "description": "False positive - planned deployment",
      "resolvedBy": "user-123",
      "timestamp": "2024-01-16T10:30:00.000Z"
    },
    "resolvedAt": "2024-01-16T10:30:00.000Z",
    "resolvedBy": "user-123"
  }
}
```

## Rate Limiting

The routes implement two rate limiting strategies:

### 1. Cost Data Endpoints
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: `/costs`, `/costs/by-service`, `/costs/trends`, `/anomalies` (GET)

### 2. Anomaly Modification Endpoints
- **Limit**: 20 requests per 15 minutes per IP
- **Applies to**: `/anomalies/:id/resolve` (POST)

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when the rate limit resets

## Error Handling

All endpoints follow a consistent error response format:

### Validation Errors (400 Bad Request)
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": "startDate",
      "message": "Invalid start date format, expected ISO 8601"
    }
  ]
}
```

### Authentication Errors (401 Unauthorized)
```json
{
  "success": false,
  "error": "User not authenticated or tenant ID missing"
}
```

### Authorization Errors (403 Forbidden)
```json
{
  "success": false,
  "error": "Forbidden - Anomaly does not belong to your tenant"
}
```

### Not Found Errors (404 Not Found)
```json
{
  "success": false,
  "error": "Anomaly not found"
}
```

### Rate Limit Errors (429 Too Many Requests)
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

### Internal Server Errors (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Detailed error message (in development mode)"
}
```

## Testing

### Manual Testing with curl

```bash
# 1. Login to get JWT token
TOKEN=$(curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.tokens.accessToken')

# 2. Get cost data
curl -X GET "http://localhost:4000/api/v1/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Get cost by service
curl -X GET "http://localhost:4000/api/v1/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Get cost trends
curl -X GET "http://localhost:4000/api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly" \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Get anomalies
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?status=open" \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. Resolve an anomaly
curl -X POST "http://localhost:4000/api/v1/finops/anomalies/<anomaly-id>/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution":"Fixed by scaling down instances"}' | jq
```

## Dependencies

The module requires:

- **Prisma**: Database ORM (already installed)
- **Zod**: Schema validation (already installed)
- **Express Rate Limit**: API rate limiting (already installed)
- **EventEmitter**: For event-driven architecture (Node.js built-in)

All dependencies are already present in `package.json`.

## Database Schema

The endpoints use the following Prisma models:

- `CostData`: Cost records
- `CostAnomaly`: Anomaly records
- `Tenant`: Multi-tenancy support
- `CloudAccount`: Cloud provider accounts

Ensure migrations are up to date:

```bash
npm run prisma:migrate
```

## Monitoring & Logging

All controller methods include comprehensive logging:

```typescript
console.log(`[CostsController] getCosts - Tenant: ${tenantId}, DateRange: ...`);
console.log(`[CostsController] getCosts - Retrieved ${costs.length} cost records`);
```

Logs are prefixed with `[CostsController]` for easy filtering.

## Security Considerations

1. **Authentication**: All routes require valid JWT tokens
2. **Tenant Isolation**: Data is filtered by `tenantId` from authenticated user
3. **Input Validation**: All inputs validated with Zod schemas
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **SQL Injection**: Prevented by Prisma's parameterized queries
6. **XSS Protection**: JSON responses are safe by default

## Next Steps

1. **Integration Tests**: See Task 2.7 for test implementation
2. **Frontend Integration**: Connect Next.js frontend to these endpoints
3. **Monitoring**: Set up Grafana dashboards for endpoint metrics
4. **Documentation**: Generate OpenAPI/Swagger documentation

## Troubleshooting

### Issue: "User not authenticated or tenant ID missing"

**Cause**: JWT token is missing or invalid

**Solution**: Verify authentication middleware is working correctly

### Issue: "Validation error" on date fields

**Cause**: Date format is incorrect

**Solution**: Use ISO 8601 format (e.g., `2024-01-01T00:00:00Z`)

### Issue: 429 Too Many Requests

**Cause**: Rate limit exceeded

**Solution**: Wait for rate limit window to reset (shown in `RateLimit-Reset` header)

## Support

For issues or questions, contact the development team or refer to:
- Project documentation in `/docs`
- Prisma schema in `/prisma/schema.prisma`
- Service implementations in `/src/modules/finops/services`
