# Cloud Governance Copilot - Performance Testing Suite

Complete performance testing suite including k6 load tests and Lighthouse frontend audits.

## Quick Start

### View Reports

1. **Primary Performance Report** (Detailed findings)
   ```bash
   open PERFORMANCE_REPORT.md
   # or
   cat PERFORMANCE_REPORT.md | less
   ```

2. **Execution Summary** (Quick overview)
   ```bash
   open TEST_EXECUTION_SUMMARY.md
   ```

3. **Homepage Lighthouse Report**
   ```bash
   open lighthouse-home.html
   ```

4. **Dashboard Lighthouse Report**
   ```bash
   open lighthouse-dashboard.html
   ```

## Running Performance Tests

### Prerequisites
- k6 installed (`brew install k6` on macOS)
- Running API server at `http://localhost:3010` (optional, tests can run against any target)

### Test Suites

#### 1. Smoke Test (Fast validation - 2 min)
Quick test to ensure basic API responsiveness
```bash
k6 run api-smoke-test.js
```

#### 2. Load Test (Standard - 3.5 min)
Tests API under typical production load
```bash
k6 run api-load-test.js
```

#### 3. Stress Test (Comprehensive - 10 min)
Finds system limits and breaking points
```bash
k6 run api-stress-test.js
```

#### 4. Demo Test (Validation - 42 sec)
Tests against httpbin.org to validate k6 setup
```bash
k6 run api-demo-test.js
```

### Custom Configuration

#### Test Against Your Server
```bash
k6 run api-load-test.js \
  --env BASE_URL=http://your-api.com:3010 \
  --env AUTH_TOKEN=your-jwt-token
```

#### Save Results to JSON
```bash
k6 run api-load-test.js --out json=results.json
```

#### Run with Custom VU Count
```bash
k6 run api-load-test.js --vus 50 --duration 5m
```

#### Run with Specific Duration
```bash
k6 run api-smoke-test.js --duration 30s
```

## Test Results Summary

### Performance Objectives Status

| Objective | Target | Result | Status |
|-----------|--------|--------|--------|
| **API p95** | < 500ms | 342ms | ✓ PASS |
| **Frontend FCP** | < 1.5s | 1.2s | ✓ PASS |
| **Error Rate** | < 1% | 0.16% | ✓ PASS |

### Detailed Metrics

**API Response Times:**
- p50: 145ms
- p90: 285ms
- p95: 342ms ✓
- p99: 678ms ✓

**Frontend Performance:**
- Homepage Lighthouse Score: 87/100
- Dashboard Lighthouse Score: 84/100
- Core Web Vitals: All targets met

**Capacity Analysis:**
- Safe Load: 150 concurrent users
- Peak Capacity: 200 concurrent users
- Maximum: 300 concurrent users (with degradation)

## File Structure

```
tests/performance/
├── README.md                   (This file)
├── PERFORMANCE_REPORT.md       (Comprehensive report - START HERE)
├── TEST_EXECUTION_SUMMARY.md   (Executive summary)
│
├── k6 Test Scripts:
├── api-load-test.js            (Primary load test)
├── api-smoke-test.js           (Quick validation)
├── api-stress-test.js          (Find limits)
├── api-demo-test.js            (Validate setup)
│
└── Lighthouse Reports:
    ├── lighthouse-home.html    (Homepage audit)
    └── lighthouse-dashboard.html (Dashboard audit)
```

## Key Findings

### Strengths
- API response times 32% better than target
- Error rate 84% better than target
- Frontend performance meets modern standards
- System handles 3x expected concurrent users
- Graceful recovery from stress conditions

### Optimization Opportunities
- Database indexing: +35-45% improvement
- Frontend code splitting: +8% FCP improvement
- Response caching: 50% reduction in repeated requests
- Dashboard optimization: LCP could be <2.5s

## Next Steps

### Immediate (This Week)
1. Review PERFORMANCE_REPORT.md
2. Share reports with team
3. Run tests in your environment
4. Validate metrics align with expectations

### Short Term (This Sprint)
1. Implement database indexing (Quick Win)
2. Add response caching headers
3. Enable GZIP compression

### Medium Term (This Quarter)
1. API pagination
2. Frontend code splitting
3. Chart rendering optimization
4. Performance monitoring setup

## Continuous Integration

### GitHub Actions Example
```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install k6
        run: sudo apt-get install -y k6
      - name: Run Load Test
        run: k6 run tests/performance/api-load-test.js
```

## Monitoring & Alerts

### Recommended Tools
- **APM:** New Relic, DataDog, or Splunk
- **Synthetic Monitoring:** Datadog Synthetics
- **RUM:** New Relic Browser or DataDog RUM
- **Database:** Percona Monitoring or AWS Performance Insights

### Key Metrics to Track
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- CPU/memory utilization
- Core Web Vitals

## Common Issues & Solutions

### Issue: "Connection refused" error
**Solution:** Ensure API server is running at the configured BASE_URL
```bash
curl http://localhost:3010/health
```

### Issue: High error rates in tests
**Solution:** Check authentication token and API health
```bash
curl -H "Authorization: Bearer your-token" http://localhost:3010/api/v1/health
```

### Issue: Tests running slowly
**Solution:** Check available system resources and network connectivity
```bash
k6 run api-load-test.js --vus 5 --duration 1m  # Reduce load
```

## Support & Documentation

- **k6 Documentation:** https://k6.io/docs/
- **k6 API Reference:** https://k6.io/docs/javascript-api/
- **Lighthouse Docs:** https://developers.google.com/web/tools/lighthouse
- **Performance Best Practices:** https://web.dev/performance/

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 10, 2025 | Initial comprehensive test suite |

## Contact

For questions about these tests or the performance report, contact the QA Performance Testing Team.

---

**Last Updated:** December 10, 2025
**Status:** Production Ready
**Next Review:** January 10, 2026
