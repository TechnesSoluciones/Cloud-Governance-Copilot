/**
 * k6 Performance Test: API Stress Testing
 *
 * This test pushes the API to its limits to identify breaking points,
 * maximum throughput, and behavior under extreme load.
 *
 * Characteristics:
 * - High virtual users (100-500+)
 * - Longer duration (5-10 minutes)
 * - Identifies system limits and breaking points
 * - Shows degradation patterns
 *
 * Run: k6 run api-stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const timeouts = new Counter('stress_timeouts');
const slowRequests = new Counter('stress_slow_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Stress test configuration - extreme load to find limits
export const options = {
  stages: [
    { duration: '1m', target: 50 },     // Ramp to 50 users
    { duration: '2m', target: 150 },    // Spike to 150 users
    { duration: '3m', target: 300 },    // Push to 300 users (stress phase)
    { duration: '2m', target: 150 },    // Back down to 150
    { duration: '2m', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    // More realistic thresholds for stress testing
    http_req_duration: ['p(99)<3000', 'p(95)<2000'],
    http_req_failed: ['rate<0.2'],
    stress_errors: ['rate<0.2'],
  },
  // Don't abort during stress test - we want to see all the data
  abortOnFail: false,
};

function makeRequest(url, method = 'GET') {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    tags: { name: url },
    timeout: '5s',
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, '{}', params);
  }

  responseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);

  if (response.timings.duration > 2000) {
    slowRequests.add(1);
  }

  return response;
}

export default function () {
  // Test 1: Health endpoint
  group('Stress - Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'health status 200 or timeout': (r) => r.status === 200 || r.status === 0,
      'response time acceptable': (r) => r.timings.duration < 3000,
    });
  });

  sleep(0.1);

  // Test 2: Multiple simultaneous requests
  group('Stress - Multiple Endpoints', () => {
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/health`],
      ['GET', `${BASE_URL}/api/status`],
      ['GET', `${BASE_URL}/`],
    ]);

    responses.forEach((response) => {
      check(response, {
        'request completed': (r) => r.status > 0,
      });
    });
  });

  sleep(Math.random() * 0.5); // Random delay between 0-500ms
}

export function setup() {
  console.log('Starting API Stress Test');
  console.log(`Target: ${BASE_URL}`);
  console.log('WARNING: This test will generate high load');
}

export function teardown(data) {
  console.log('Stress test completed');
  console.log(`Total timeouts recorded: ${data.metrics.stress_timeouts.values.count}`);
  console.log(`Total slow requests (>2s): ${data.metrics.stress_slow_requests.values.count}`);
}
