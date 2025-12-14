/**
 * k6 Performance Test: API Load Testing
 *
 * This script tests the Cloud Governance Copilot API under load to ensure:
 * - Response times are acceptable (p95 < 500ms)
 * - Error rates are minimal (< 1%)
 * - The API can handle concurrent users
 *
 * Prerequisites:
 * 1. Install k6: brew install k6 (macOS) or https://k6.io/docs/getting-started/installation
 * 2. Start the API Gateway: cd apps/api-gateway && npm run dev
 * 3. Ensure test data is loaded in the database
 * 4. Generate a valid JWT token for authentication
 *
 * Usage:
 * k6 run api-load-test.js
 *
 * Advanced Usage:
 * k6 run --vus 100 --duration 5m api-load-test.js    # 100 users for 5 minutes
 * k6 run --out json=results.json api-load-test.js    # Save results to file
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 50 },   // Stay at 50 concurrent users for 1 minute
    { duration: '30s', target: 100 }, // Spike to 100 users for 30 seconds
    { duration: '1m', target: 50 },   // Back to 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests must complete below 1000ms
    'http_req_duration{type:finops}': ['p(99)<1000'],
    'http_req_duration{type:assets}': ['p(99)<800'],
    'http_req_duration{type:security}': ['p(99)<800'],

    // Error rate must be below 1%
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
  // Abort test if error rate exceeds 5%
  abortOnFail: true,
  abortOnFailThreshold: 0.05,
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'your-jwt-token-here';

// Helper function to make authenticated requests
function makeAuthenticatedRequest(url, method = 'GET', body = null) {
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { name: url }, // Tag for better metrics
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, body ? JSON.stringify(body) : null, params);
  } else if (method === 'PUT') {
    response = http.put(url, body ? JSON.stringify(body) : null, params);
  } else if (method === 'DELETE') {
    response = http.del(url, params);
  }

  // Record custom metrics
  apiResponseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);

  return response;
}

/**
 * Main test function - executed by each virtual user
 */
export default function () {
  // Test 1: Health Check
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);

    check(response, {
      'health check returns 200': (r) => r.status === 200,
      'health check has status field': (r) => {
        try {
          return JSON.parse(r.body).status === 'healthy';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(1);

  // Test 2: FinOps Cost Endpoints
  group('FinOps - Cost Queries', () => {
    // Get costs summary
    const costsResponse = makeAuthenticatedRequest(`${BASE_URL}/api/v1/finops/costs`, 'GET');
    costsResponse.tags = { ...costsResponse.tags, type: 'finops' };

    check(costsResponse, {
      'costs endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'costs response time < 500ms': (r) => r.timings.duration < 500,
      'costs response has valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    sleep(0.5);

    // Get cost trends
    const trendsResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/finops/costs/trends?period=7d`,
      'GET'
    );
    trendsResponse.tags = { ...trendsResponse.tags, type: 'finops' };

    check(trendsResponse, {
      'trends endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'trends response time < 800ms': (r) => r.timings.duration < 800,
    });

    sleep(0.5);

    // Get cost by service
    const serviceResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/finops/costs/by-service`,
      'GET'
    );
    serviceResponse.tags = { ...serviceResponse.tags, type: 'finops' };

    check(serviceResponse, {
      'by-service endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'by-service response time < 600ms': (r) => r.timings.duration < 600,
    });
  });

  sleep(1);

  // Test 3: Assets Endpoints
  group('Assets - Inventory Queries', () => {
    // List assets
    const assetsResponse = makeAuthenticatedRequest(`${BASE_URL}/api/v1/assets`, 'GET');
    assetsResponse.tags = { ...assetsResponse.tags, type: 'assets' };

    check(assetsResponse, {
      'assets endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'assets response time < 400ms': (r) => r.timings.duration < 400,
      'assets returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data) || r.status === 401;
        } catch (e) {
          return false;
        }
      },
    });

    sleep(0.5);

    // Search assets
    const searchResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/assets?search=compute&type=ec2`,
      'GET'
    );
    searchResponse.tags = { ...searchResponse.tags, type: 'assets' };

    check(searchResponse, {
      'asset search returns 200 or 401': (r) => [200, 401].includes(r.status),
      'asset search response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  // Test 4: Security Findings Endpoints
  group('Security - Findings Queries', () => {
    // List security findings
    const findingsResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/security/findings`,
      'GET'
    );
    findingsResponse.tags = { ...findingsResponse.tags, type: 'security' };

    check(findingsResponse, {
      'findings endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'findings response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(0.5);

    // Get findings by severity
    const severityResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/security/findings?severity=high`,
      'GET'
    );
    severityResponse.tags = { ...severityResponse.tags, type: 'security' };

    check(severityResponse, {
      'severity filter returns 200 or 401': (r) => [200, 401].includes(r.status),
      'severity filter response time < 600ms': (r) => r.timings.duration < 600,
    });
  });

  sleep(1);

  // Test 5: Cloud Accounts Endpoints
  group('Cloud Accounts - Management', () => {
    // List cloud accounts
    const accountsResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/cloud-accounts`,
      'GET'
    );

    check(accountsResponse, {
      'accounts endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'accounts response time < 400ms': (r) => r.timings.duration < 400,
    });
  });

  sleep(1);

  // Test 6: Recommendations Endpoints
  group('Recommendations - Cost Optimization', () => {
    // Get recommendations
    const recsResponse = makeAuthenticatedRequest(
      `${BASE_URL}/api/v1/finops/recommendations`,
      'GET'
    );

    check(recsResponse, {
      'recommendations endpoint returns 200 or 401': (r) => [200, 401].includes(r.status),
      'recommendations response time < 800ms': (r) => r.timings.duration < 800,
    });
  });

  sleep(2);
}

/**
 * Setup function - runs once before all tests
 */
export function setup() {
  console.log('Starting Cloud Governance Copilot API Load Test');
  console.log(`Target: ${BASE_URL}`);
  console.log('Simulating user load patterns...');
  console.log('');
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('');
  console.log('Load test completed!');
  console.log('Check results above for performance metrics.');
}

/**
 * Handle summary - custom summary report
 */
export function handleSummary(data) {
  console.log('');
  console.log('====================================');
  console.log('  Performance Test Summary');
  console.log('====================================');
  console.log('');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.count}`);
  console.log(`Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log('');
  console.log('Response Times:');
  console.log(`  p50: ${data.metrics.http_req_duration.values.p50.toFixed(2)}ms`);
  console.log(`  p90: ${data.metrics.http_req_duration.values.p90.toFixed(2)}ms`);
  console.log(`  p95: ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms`);
  console.log(`  p99: ${data.metrics.http_req_duration.values.p99.toFixed(2)}ms`);
  console.log('');
  console.log('Thresholds:');

  const thresholds = data.metrics.http_req_duration.thresholds;
  for (const threshold in thresholds) {
    const passed = thresholds[threshold].ok ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${threshold}: ${passed}`);
  }

  console.log('');
  console.log('====================================');

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
