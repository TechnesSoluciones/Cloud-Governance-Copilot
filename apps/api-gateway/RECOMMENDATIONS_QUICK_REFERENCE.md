# FinOps Recommendations - Quick Reference Guide

## API Endpoints

### Base URL
```
http://localhost:4000/api/v1/finops/recommendations
```

### Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Generate Recommendations
Generate new cost optimization recommendations.

```http
POST /api/v1/finops/recommendations/generate
```

**Authorization:** Admin, FinOps Manager
**Rate Limit:** 20 requests per 15 minutes

**Request Body:**
```json
{
  "cloudAccountId": "uuid" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendationsGenerated": 15,
    "totalEstimatedSavings": 1250.50,
    "errors": []
  }
}
```

---

### 2. Get Summary
Get recommendations summary and statistics.

```http
GET /api/v1/finops/recommendations/summary?status=open&provider=AWS
```

**Authorization:** Admin, FinOps Manager, FinOps Viewer
**Rate Limit:** 100 requests per 15 minutes

**Query Parameters:**
- `status` (optional): `open` | `applied` | `dismissed`
- `provider` (optional): `AWS` | `AZURE`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRecommendations": 42,
    "totalEstimatedSavings": 5432.10,
    "byType": {
      "idle_resource": { "count": 12, "savings": 1200.50 },
      "rightsize": { "count": 8, "savings": 800.00 }
    },
    "byPriority": {
      "high": 15,
      "medium": 20,
      "low": 7
    },
    "byProvider": {
      "AWS": 30,
      "AZURE": 12
    }
  }
}
```

---

### 3. List Recommendations
List recommendations with filters, pagination, and sorting.

```http
GET /api/v1/finops/recommendations?status=open&priority=high&page=1&limit=20
```

**Authorization:** Admin, FinOps Manager, FinOps Viewer
**Rate Limit:** 100 requests per 15 minutes

**Query Parameters:**
- `status` (optional): `open` | `applied` | `dismissed`
- `type` (optional): `idle_resource` | `rightsize` | `unused_resource` | `delete_snapshot` | `reserved_instance`
- `provider` (optional): `AWS` | `AZURE`
- `priority` (optional): `high` | `medium` | `low`
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Results per page
- `sortBy` (default: `createdAt`): `createdAt` | `estimatedSavings` | `priority` | `provider`
- `sortOrder` (default: `desc`): `asc` | `desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "uuid",
        "type": "idle_resource",
        "priority": "high",
        "status": "open",
        "provider": "AWS",
        "service": "EC2",
        "resourceId": "i-1234567890abcdef0",
        "title": "Stop idle EC2 instance",
        "description": "Instance has been idle for 7 days",
        "estimatedSavings": 156.00,
        "savingsPeriod": "monthly",
        "actionable": true,
        "createdAt": "2025-12-08T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

---

### 4. Get Single Recommendation
Get detailed information about a specific recommendation.

```http
GET /api/v1/finops/recommendations/{id}
```

**Authorization:** Admin, FinOps Manager, FinOps Viewer
**Rate Limit:** 100 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "idle_resource",
    "priority": "high",
    "status": "open",
    "provider": "AWS",
    "service": "EC2",
    "resourceId": "i-1234567890abcdef0",
    "title": "Stop idle EC2 instance",
    "description": "Instance has been idle for 7 days",
    "estimatedSavings": 156.00,
    "savingsPeriod": "monthly",
    "actionable": true,
    "actionScript": "aws ec2 stop-instances --instance-ids i-1234567890abcdef0",
    "createdAt": "2025-12-08T10:30:00Z",
    "appliedAt": null,
    "cloudAccount": {
      "id": "uuid",
      "accountName": "Production AWS Account",
      "provider": "AWS"
    }
  }
}
```

---

### 5. Apply Recommendation
Mark a recommendation as applied/implemented.

```http
POST /api/v1/finops/recommendations/{id}/apply
```

**Authorization:** Admin, FinOps Manager
**Rate Limit:** 20 requests per 15 minutes

**Request Body:**
```json
{
  "notes": "Successfully resized instance from m5.large to m5.medium" // Optional, max 1000 chars
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "applied",
    "appliedAt": "2025-12-08T14:30:00Z",
    "notes": "Successfully resized instance from m5.large to m5.medium"
  },
  "message": "Recommendation applied successfully"
}
```

---

### 6. Dismiss Recommendation
Dismiss a recommendation as not applicable.

```http
POST /api/v1/finops/recommendations/{id}/dismiss
```

**Authorization:** Admin, FinOps Manager
**Rate Limit:** 20 requests per 15 minutes

**Request Body:**
```json
{
  "reason": "This resource is required for production workload" // Required, min 10 chars
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "dismissed",
    "dismissReason": "This resource is required for production workload"
  },
  "message": "Recommendation dismissed successfully"
}
```

---

## BullMQ Job Functions

### Schedule Daily Job
```typescript
import { scheduleDailyRecommendationGeneration } from './shared/jobs';

// Schedule job to run daily at 3:00 AM UTC
await scheduleDailyRecommendationGeneration();
```

### Trigger Manual Generation (All Tenants)
```typescript
import { triggerManualRecommendationGeneration } from './shared/jobs';

const job = await triggerManualRecommendationGeneration();
console.log('Job ID:', job.id);
```

### Trigger Manual Generation (Single Tenant)
```typescript
const job = await triggerManualRecommendationGeneration('tenant-uuid');
console.log('Job ID:', job.id);
```

### Trigger Manual Generation (Single Account)
```typescript
const job = await triggerManualRecommendationGeneration('tenant-uuid', 'account-uuid');
console.log('Job ID:', job.id);
```

### Graceful Shutdown
```typescript
import { shutdownRecommendationGenerationJob } from './shared/jobs';

// During application shutdown
await shutdownRecommendationGenerationJob();
```

---

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "cloudAccountId",
        "message": "Cloud account ID must be a valid UUID"
      }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "code": "UNAUTHORIZED"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Recommendation not found",
    "code": "NOT_FOUND"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "message": "Too many requests from this IP, please try again later",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_ERROR"
  }
}
```

---

## User Roles & Permissions

| Role | Generate | List | Get | Summary | Apply | Dismiss |
|------|----------|------|-----|---------|-------|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FinOps Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FinOps Viewer | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Read Operations (GET) | 100 requests | 15 minutes |
| Write Operations (POST) | 20 requests | 15 minutes |

**Rate Limit Headers:**
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## cURL Examples

### Generate Recommendations
```bash
curl -X POST http://localhost:4000/api/v1/finops/recommendations/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cloudAccountId": "123e4567-e89b-12d3-a456-426614174000"}'
```

### Get Summary
```bash
curl -X GET "http://localhost:4000/api/v1/finops/recommendations/summary?status=open" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Recommendations
```bash
curl -X GET "http://localhost:4000/api/v1/finops/recommendations?status=open&priority=high&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Single Recommendation
```bash
curl -X GET "http://localhost:4000/api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Apply Recommendation
```bash
curl -X POST "http://localhost:4000/api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000/apply" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Implemented the recommendation"}'
```

### Dismiss Recommendation
```bash
curl -X POST "http://localhost:4000/api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000/dismiss" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Not applicable to our use case"}'
```

---

## Job Schedule

**Cron Pattern:** `0 3 * * *`
**Execution Time:** Daily at 3:00 AM UTC
**Rationale:** Runs after cost collection (2:00 AM) to ensure latest data

---

## Quick Troubleshooting

### Routes Not Working
```bash
# Check if server is running
curl http://localhost:4000/health

# Check if routes are registered
curl http://localhost:4000/api/v1
```

### Job Not Running
```typescript
// Check if job is scheduled
import { recommendationsQueue } from './shared/jobs';
const jobs = await recommendationsQueue.getRepeatableJobs();
console.log(jobs);
```

### Authentication Issues
```bash
# Verify token is valid
curl -X GET http://localhost:4000/api/v1/finops/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN" -v
# Look for 401 vs 200 status code
```

---

## File Locations

- **Routes:** `/src/modules/finops/routes/recommendations.routes.ts`
- **Job:** `/src/shared/jobs/recommendations-generation.job.ts`
- **Validator:** `/src/modules/finops/validators/recommendations.validator.ts`
- **Controller:** `/src/modules/finops/controllers/recommendations.controller.ts`
- **Service:** `/src/modules/finops/services/recommendation-generator.service.ts`

---

## Support

For issues or questions:
1. Check logs: `docker logs -f api-gateway`
2. Check Redis: `redis-cli ping`
3. Review full documentation: `RECOMMENDATIONS_IMPLEMENTATION_SUMMARY.md`
