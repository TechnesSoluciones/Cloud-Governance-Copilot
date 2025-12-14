/**
 * k6 Performance Test: API Smoke Testing
 *
 * This is a quick validation test to ensure the API is accessible and responding
 * without errors under minimal load.
 *
 * Characteristics:
 * - Very low virtual users (1-5)
 * - Short duration (1-2 minutes)
 * - Used to verify basic functionality
 * - Quick feedback mechanism
 *
 * Run: k6 run api-smoke-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('smoke_errors');
const responseTime = new Trend('smoke_response_time');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Smoke test configuration - minimal load for quick validation
export const options = {
  stages: [
    { duration: '30s', target: 1 },  // Warm up with 1 user
    { duration: '1m', target: 3 },   // Verify with 3 users
    { duration: '30s', target: 0 },  // Cool down
  ],
  thresholds: {
    // Very permissive for smoke tests
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    smoke_errors: ['rate<0.1'],
  },
};

// Helper function
function makeRequest(url, method = 'GET') {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    tags: { name: url },
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, null, params);
  }

  responseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);

  return response;
}

export default function () {
  // Test 1: Health Check
  group('Smoke Test - Health', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'health endpoint responds': (r) => r.status === 200 || r.status === 404,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });
  });

  sleep(0.5);

  // Test 2: Home Page (if available)
  group('Smoke Test - Home', () => {
    const response = http.get(`${BASE_URL}/`);
    check(response, {
      'homepage accessible': (r) => [200, 301, 302].includes(r.status),
    });
  });

  sleep(1);

  // Test 3: API Endpoint (no auth required)
  group('Smoke Test - API', () => {
    const response = http.get(`${BASE_URL}/api/health`);
    check(response, {
      'API health responds': (r) => [200, 404, 401].includes(r.status),
      'response has content': (r) => r.body.length > 0,
    });
  });

  sleep(1);
}

export function setup() {
  console.log('Starting API Smoke Test');
  console.log(`Target: ${BASE_URL}`);
}

export function teardown(data) {
  console.log('Smoke test completed');
}
