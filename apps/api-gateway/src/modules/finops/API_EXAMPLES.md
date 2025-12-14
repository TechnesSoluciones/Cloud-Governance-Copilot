# FinOps API - Request/Response Examples

This document provides complete request/response examples for all FinOps endpoints.

## Authentication

All endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Base URL

```
http://localhost:4000/api/v1/finops
```

---

## 1. GET /api/v1/finops/costs

### Request

```http
GET /api/v1/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "service": "Amazon EC2",
      "provider": "aws",
      "amount": 145.50,
      "currency": "USD"
    },
    {
      "date": "2024-01-01",
      "service": "Amazon RDS",
      "provider": "aws",
      "amount": 89.25,
      "currency": "USD"
    },
    {
      "date": "2024-01-02",
      "service": "Amazon EC2",
      "provider": "aws",
      "amount": 152.75,
      "currency": "USD"
    },
    {
      "date": "2024-01-02",
      "service": "Amazon S3",
      "provider": "aws",
      "amount": 12.30,
      "currency": "USD"
    }
  ],
  "total": 399.80,
  "currency": "USD"
}
```

### Error Response (400 Bad Request)

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

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "User not authenticated or tenant ID missing"
}
```

---

## 2. GET /api/v1/finops/costs/by-service

### Request

```http
GET /api/v1/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "service": "Amazon EC2",
      "provider": "aws",
      "totalCost": 4650.75,
      "percentage": 62.3
    },
    {
      "service": "Amazon RDS",
      "provider": "aws",
      "totalCost": 2100.50,
      "percentage": 28.1
    },
    {
      "service": "Amazon S3",
      "provider": "aws",
      "totalCost": 450.25,
      "percentage": 6.0
    },
    {
      "service": "Amazon CloudWatch",
      "provider": "aws",
      "totalCost": 268.50,
      "percentage": 3.6
    }
  ]
}
```

### With Provider Filter

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. GET /api/v1/finops/costs/trends

### Request (Daily)

```http
GET /api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-07T23:59:59Z&granularity=daily HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Daily)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-07T23:59:59Z&granularity=daily" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK) - Daily

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "totalCost": 234.75,
      "currency": "USD"
    },
    {
      "date": "2024-01-02",
      "totalCost": 245.50,
      "currency": "USD"
    },
    {
      "date": "2024-01-03",
      "totalCost": 238.90,
      "currency": "USD"
    },
    {
      "date": "2024-01-04",
      "totalCost": 251.25,
      "currency": "USD"
    },
    {
      "date": "2024-01-05",
      "totalCost": 242.60,
      "currency": "USD"
    },
    {
      "date": "2024-01-06",
      "totalCost": 248.80,
      "currency": "USD"
    },
    {
      "date": "2024-01-07",
      "totalCost": 255.10,
      "currency": "USD"
    }
  ]
}
```

### Request (Weekly)

```http
GET /api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Weekly)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK) - Weekly

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-W01",
      "totalCost": 1716.90,
      "currency": "USD"
    },
    {
      "date": "2024-W02",
      "totalCost": 1823.45,
      "currency": "USD"
    },
    {
      "date": "2024-W03",
      "totalCost": 1755.30,
      "currency": "USD"
    },
    {
      "date": "2024-W04",
      "totalCost": 1892.15,
      "currency": "USD"
    },
    {
      "date": "2024-W05",
      "totalCost": 1282.20,
      "currency": "USD"
    }
  ]
}
```

### Request (Monthly)

```http
GET /api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&granularity=monthly HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Monthly)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&granularity=monthly" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK) - Monthly

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01",
      "totalCost": 7470.00,
      "currency": "USD"
    },
    {
      "date": "2024-02",
      "totalCost": 8125.50,
      "currency": "USD"
    },
    {
      "date": "2024-03",
      "totalCost": 7890.25,
      "currency": "USD"
    }
  ]
}
```

---

## 4. GET /api/v1/finops/anomalies

### Request (All Open Anomalies)

```http
GET /api/v1/finops/anomalies?status=open HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (All Open)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?status=open" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response (200 OK)

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
      "expectedCost": 150.00,
      "actualCost": 950.00,
      "deviation": 533.33,
      "detectedAt": "2024-01-16T02:00:00.000Z",
      "resourceId": "i-1234567890abcdef0",
      "rootCause": null,
      "resolvedAt": null,
      "resolvedBy": null
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "date": "2024-01-16",
      "service": "Amazon RDS",
      "provider": "aws",
      "severity": "high",
      "status": "open",
      "expectedCost": 80.00,
      "actualCost": 250.00,
      "deviation": 212.50,
      "detectedAt": "2024-01-17T02:00:00.000Z",
      "resourceId": "db-instance-prod-001",
      "rootCause": null,
      "resolvedAt": null,
      "resolvedBy": null
    }
  ],
  "count": 2
}
```

### Request (Critical Anomalies Only)

```http
GET /api/v1/finops/anomalies?severity=critical&status=open HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Critical Only)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?severity=critical&status=open" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Request (Date Range Filter)

```http
GET /api/v1/finops/anomalies?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Date Range)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Request (Service Filter)

```http
GET /api/v1/finops/anomalies?service=Amazon%20EC2&status=open HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### cURL Example (Service Filter)

```bash
curl -X GET "http://localhost:4000/api/v1/finops/anomalies?service=Amazon%20EC2&status=open" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 5. POST /api/v1/finops/anomalies/:id/resolve

### Request

```http
POST /api/v1/finops/anomalies/550e8400-e29b-41d4-a716-446655440000/resolve HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "resolution": "False positive - planned deployment for scaling event. Instances were provisioned for load testing."
}
```

### cURL Example

```bash
curl -X POST "http://localhost:4000/api/v1/finops/anomalies/550e8400-e29b-41d4-a716-446655440000/resolve" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "False positive - planned deployment for scaling event"
  }'
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "resolved",
    "rootCause": {
      "type": "manual_resolution",
      "description": "False positive - planned deployment for scaling event",
      "resolvedBy": "770e8400-e29b-41d4-a716-446655440002",
      "timestamp": "2024-01-16T10:30:00.000Z"
    },
    "resolvedAt": "2024-01-16T10:30:00.000Z",
    "resolvedBy": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

### Request (With Custom resolvedBy)

```http
POST /api/v1/finops/anomalies/550e8400-e29b-41d4-a716-446655440000/resolve HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "resolution": "Incident was due to misconfigured auto-scaling policy. Policy has been updated to prevent future occurrences.",
  "resolvedBy": "880e8400-e29b-41d4-a716-446655440003"
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Anomaly not found"
}
```

### Error Response (403 Forbidden)

```json
{
  "success": false,
  "error": "Forbidden - Anomaly does not belong to your tenant"
}
```

### Error Response (400 Bad Request - Already Resolved)

```json
{
  "success": false,
  "error": "Anomaly is already resolved"
}
```

### Error Response (400 Bad Request - Validation)

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": "resolution",
      "message": "Resolution description must be at least 10 characters"
    }
  ]
}
```

---

## Rate Limiting Examples

### Rate Limit Headers (Normal Request)

```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1705395600

{
  "success": true,
  "data": [...]
}
```

### Rate Limit Exceeded (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1705395600

{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Complete Testing Script

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api/v1"
EMAIL="user@example.com"
PASSWORD="password123"

# 1. Login and get token
echo "Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.tokens.accessToken')

echo "Token: $TOKEN"
echo ""

# 2. Get costs
echo "Getting costs..."
curl -s -X GET "$BASE_URL/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 3. Get costs by service
echo "Getting costs by service..."
curl -s -X GET "$BASE_URL/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 4. Get cost trends (weekly)
echo "Getting cost trends (weekly)..."
curl -s -X GET "$BASE_URL/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 5. Get open anomalies
echo "Getting open anomalies..."
curl -s -X GET "$BASE_URL/finops/anomalies?status=open" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 6. Resolve an anomaly (replace with actual ID)
# ANOMALY_ID="550e8400-e29b-41d4-a716-446655440000"
# echo "Resolving anomaly $ANOMALY_ID..."
# curl -s -X POST "$BASE_URL/finops/anomalies/$ANOMALY_ID/resolve" \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"resolution":"Fixed by scaling down instances"}' | jq
# echo ""

echo "Testing complete!"
```

Save this as `test_finops_api.sh` and run:

```bash
chmod +x test_finops_api.sh
./test_finops_api.sh
```
