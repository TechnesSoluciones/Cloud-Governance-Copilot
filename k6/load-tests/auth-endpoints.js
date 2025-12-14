import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const registerDuration = new Trend('register_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.05'],                  // Error rate < 5%
    'errors': ['rate<0.05'],                           // Custom error rate < 5%
  },
};

const BASE_URL = 'http://localhost:4000';

// Generate random email for testing
function randomEmail() {
  return `loadtest-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Generate random tenant name
function randomTenantName() {
  return `LoadTest Company ${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export default function () {
  // Test 1: User Registration
  group('User Registration', () => {
    const email = randomEmail();
    const payload = JSON.stringify({
      email: email,
      password: 'LoadTest123',
      fullName: 'Load Test User',
      tenantName: randomTenantName(),
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const startTime = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/auth/register`, payload, params);
    const duration = Date.now() - startTime;

    registerDuration.add(duration);

    const success = check(res, {
      'registration status is 201': (r) => r.status === 201,
      'registration returns tokens': (r) => {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.tokens;
      },
      'registration returns user data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.user && body.data.user.email === email;
      },
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 2: Health Check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);

    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check is fast': (r) => r.timings.duration < 100,
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 3: Password Reset Request
  group('Password Reset Request', () => {
    const payload = JSON.stringify({
      email: 'nonexistent@example.com', // Testing with non-existent email (should still return 200)
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/api/v1/auth/forgot-password`, payload, params);

    const success = check(res, {
      'password reset status is 200': (r) => r.status === 200,
      'password reset response is correct': (r) => {
        const body = JSON.parse(r.body);
        return body.success === true;
      },
    });

    errorRate.add(!success);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'k6/results/auth-load-test-summary.html': htmlReport(data),
    'k6/results/auth-load-test-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Results - Auth Endpoints</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #ff6b35; }
    .metric { background: #f9fafb; padding: 15px; margin: 10px 0; border-left: 4px solid #ff6b35; }
    .pass { color: #34a853; }
    .fail { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #ff6b35; color: white; }
  </style>
</head>
<body>
  <h1>Cloud Governance Copilot - Load Test Results</h1>
  <h2>Test: Authentication Endpoints</h2>
  <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>

  <div class="metric">
    <h3>Summary</h3>
    <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
    <p><strong>Failed Requests:</strong> ${data.metrics.http_req_failed.values.passes || 0}</p>
    <p><strong>Request Rate:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)}/s</p>
  </div>

  <div class="metric">
    <h3>Response Times</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Average</th>
        <th>p95</th>
        <th>p99</th>
        <th>Max</th>
      </tr>
      <tr>
        <td>HTTP Request Duration</td>
        <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
        <td class="${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'pass' : 'fail'}">
          ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
        </td>
        <td class="${data.metrics.http_req_duration.values['p(99)'] < 1000 ? 'pass' : 'fail'}">
          ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
        </td>
        <td>${data.metrics.http_req_duration.values.max.toFixed(2)}ms</td>
      </tr>
    </table>
  </div>

  <div class="metric">
    <h3>Custom Metrics</h3>
    <p><strong>Registration Duration (avg):</strong> ${data.metrics.register_duration?.values.avg.toFixed(2) || 'N/A'}ms</p>
    <p><strong>Error Rate:</strong> ${((data.metrics.errors?.values.rate || 0) * 100).toFixed(2)}%</p>
  </div>

  <div class="metric">
    <h3>Thresholds</h3>
    <p class="${data.metrics.http_req_duration.thresholds['p(95)<500'].ok ? 'pass' : 'fail'}">
      ✓ 95% of requests < 500ms: ${data.metrics.http_req_duration.thresholds['p(95)<500'].ok ? 'PASS' : 'FAIL'}
    </p>
    <p class="${data.metrics.http_req_duration.thresholds['p(99)<1000'].ok ? 'pass' : 'fail'}">
      ✓ 99% of requests < 1000ms: ${data.metrics.http_req_duration.thresholds['p(99)<1000'].ok ? 'PASS' : 'FAIL'}
    </p>
    <p class="${data.metrics.http_req_failed.thresholds['rate<0.05'].ok ? 'pass' : 'fail'}">
      ✓ Error rate < 5%: ${data.metrics.http_req_failed.thresholds['rate<0.05'].ok ? 'PASS' : 'FAIL'}
    </p>
  </div>
</body>
</html>
  `;
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  return `
${indent}================================
${indent}  Load Test Summary
${indent}================================
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.values.passes || 0}
${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
${indent}
${indent}Response Times:
${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}================================
  `;
}
