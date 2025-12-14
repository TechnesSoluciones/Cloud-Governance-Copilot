/**
 * k6 Performance Test: Demo Test with Public Service
 *
 * This test demonstrates k6 load testing against httpbin.org
 * to show that the test infrastructure is working correctly.
 *
 * Run: k6 run api-demo-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('demo_errors');
const responseTime = new Trend('demo_response_time');

// Configuration for demo test
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '20s', target: 10 },  // Increase to 10 users
    { duration: '10s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    demo_errors: ['rate<0.05'],
  },
};

export default function () {
  // Test 1: GET request
  group('Demo - GET Requests', () => {
    const response = http.get('https://httpbin.org/get');

    check(response, {
      'GET status 200': (r) => r.status === 200,
      'GET response time < 1s': (r) => r.timings.duration < 1000,
      'GET has data': (r) => r.body.length > 0,
    });

    responseTime.add(response.timings.duration);
    errorRate.add(response.status >= 400);
  });

  sleep(0.5);

  // Test 2: POST request
  group('Demo - POST Requests', () => {
    const payload = JSON.stringify({
      name: 'Test User',
      timestamp: new Date().getTime(),
    });

    const response = http.post('https://httpbin.org/post', payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(response, {
      'POST status 200': (r) => r.status === 200,
      'POST response time < 1.5s': (r) => r.timings.duration < 1500,
    });

    responseTime.add(response.timings.duration);
    errorRate.add(response.status >= 400);
  });

  sleep(0.5);

  // Test 3: Delay endpoint
  group('Demo - Delay Endpoint', () => {
    const response = http.get('https://httpbin.org/delay/1');

    check(response, {
      'Delay status 200': (r) => r.status === 200,
      'Delay response reasonable': (r) => r.timings.duration < 3000,
    });

    responseTime.add(response.timings.duration);
    errorRate.add(response.status >= 400);
  });

  sleep(1);
}

export function setup() {
  console.log('Starting Demo Performance Test against httpbin.org');
  console.log('This validates that k6 is working correctly');
}

export function teardown(data) {
  console.log('Demo test completed successfully');
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
