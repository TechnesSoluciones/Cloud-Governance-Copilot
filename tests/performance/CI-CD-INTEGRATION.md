# Performance Testing - CI/CD Integration Guide

This guide explains how to integrate the k6 performance tests into your CI/CD pipeline.

## GitHub Actions Integration

### Setup: Install k6 in CI Environment

```yaml
# .github/workflows/performance-tests.yml

name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  performance:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: copilot
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: copilot_main
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install k6
        run: |
          sudo apt-get update
          sudo apt-get install -y gpg
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/grafana.gpg \
            --keyserver keyserver.ubuntu.com --recv-keys 963FA27A
          echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" | \
            sudo tee /etc/apt/sources.list.d/grafana.list
          sudo apt-get update
          sudo apt-get install -y k6

      - name: Install dependencies
        run: |
          cd apps/api-gateway && npm ci
          cd ../../apps/frontend && npm ci

      - name: Start API server
        run: |
          cd apps/api-gateway
          npm run build
          npm start &
          sleep 10

      - name: Start Frontend server
        run: |
          cd apps/frontend
          npm run build
          npm start &
          sleep 10

      - name: Wait for services
        run: |
          for i in {1..30}; do
            if curl -f http://localhost:3010/health 2>/dev/null; then
              echo "API healthy"
              break
            fi
            echo "Waiting for API... ($i/30)"
            sleep 1
          done

      - name: Run smoke test
        run: k6 run tests/performance/api-smoke-test.js --vus 1 --duration 30s
        continue-on-error: true

      - name: Run load test
        run: |
          k6 run tests/performance/api-load-test.js \
            --out json=results/load-test.json \
            --summary-trend=avg,p(95),p(99),max,count

      - name: Parse performance results
        if: always()
        run: |
          # Extract key metrics
          python3 - <<EOF
          import json
          with open('results/load-test.json', 'r') as f:
              data = json.load(f)
              metrics = data.get('metrics', {})
              duration = metrics.get('http_req_duration', {})
              values = duration.get('values', {})

              print(f"p95 Response Time: {values.get('p95')}ms")
              print(f"p99 Response Time: {values.get('p99')}ms")
              print(f"Error Rate: {metrics.get('http_req_failed', {}).get('values', {}).get('rate', 0)*100:.2f}%")
          EOF

      - name: Check thresholds
        run: |
          k6 run tests/performance/api-load-test.js --out json=results.json

          # Fail if thresholds exceeded
          python3 - <<EOF
          import json
          import sys

          with open('results.json', 'r') as f:
              data = json.load(f)

          # Check if any thresholds were crossed
          if data.get('options', {}).get('thresholds_status', 'FAILED') == 'FAILED':
              print("Performance thresholds exceeded!")
              sys.exit(1)
          EOF

      - name: Upload performance artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: results/

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));

            const metrics = results.metrics;
            const duration = metrics.http_req_duration.values;

            const comment = `
            ## Performance Test Results

            | Metric | Value | Target | Status |
            |--------|-------|--------|--------|
            | p95 Response Time | ${duration.p95}ms | <500ms | ${duration.p95 < 500 ? '✓' : '✗'} |
            | p99 Response Time | ${duration.p99}ms | <1000ms | ${duration.p99 < 1000 ? '✓' : '✗'} |
            | Error Rate | ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}% | <1% | ${metrics.http_req_failed.values.rate < 0.01 ? '✓' : '✗'} |
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Performance test failed in ${{ github.repository }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Performance test failed\n*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref }}"
                  }
                }
              ]
            }
```

## Docker Integration

### Build and Test Docker Image

```dockerfile
# Dockerfile with performance tests

FROM node:20-alpine

WORKDIR /app

# Install k6
RUN apk add --no-cache git
RUN wget https://github.com/grafana/k6/releases/download/v1.4.2/k6-v1.4.2-linux-amd64.tar.gz
RUN tar xzf k6-v1.4.2-linux-amd64.tar.gz && mv k6 /usr/local/bin/

# Copy application
COPY . .

# Install dependencies
RUN cd apps/api-gateway && npm ci
RUN cd apps/frontend && npm ci

# Run performance tests
CMD ["k6", "run", "tests/performance/api-smoke-test.js"]
```

### Run Tests in Docker Compose

```yaml
# docker-compose.test.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: copilot
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: copilot_main
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api-gateway
    environment:
      DATABASE_URL: postgresql://copilot:testpass@postgres:5432/copilot_main
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3010:4000"

  performance-tests:
    image: grafana/k6:latest
    volumes:
      - ./tests/performance:/scripts
    environment:
      BASE_URL: http://api:4000
    command: run /scripts/api-smoke-test.js
    depends_on:
      - api

  load-tests:
    image: grafana/k6:latest
    volumes:
      - ./tests/performance:/scripts
      - ./results:/results
    environment:
      BASE_URL: http://api:4000
    command: run --out json=/results/load-test.json /scripts/api-load-test.js
    depends_on:
      - api
```

Run with:
```bash
docker-compose -f docker-compose.test.yml up
```

## Jenkins Integration

```groovy
// Jenkinsfile for performance testing

pipeline {
    agent any

    environment {
        BASE_URL = "http://localhost:3010"
        AUTH_TOKEN = credentials('jwt-test-token')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install k6') {
            steps {
                sh '''
                    curl https://dl.k6.io/install/linux.sh | sudo bash
                    k6 version
                '''
            }
        }

        stage('Build') {
            steps {
                dir('apps/api-gateway') {
                    sh 'npm ci && npm run build'
                }
                dir('apps/frontend') {
                    sh 'npm ci && npm run build'
                }
            }
        }

        stage('Start Services') {
            steps {
                sh '''
                    cd apps/api-gateway && npm start &
                    sleep 10
                    curl -f http://localhost:3010/health || exit 1
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh 'k6 run tests/performance/api-smoke-test.js --vus 1 --duration 30s'
            }
        }

        stage('Load Test') {
            steps {
                sh '''
                    k6 run tests/performance/api-load-test.js \
                        --out json=results/load-test.json
                '''
            }
        }

        stage('Analyze Results') {
            steps {
                script {
                    def results = readJSON file: 'results/load-test.json'
                    def duration = results.metrics.http_req_duration.values

                    echo "p95: ${duration.p95}ms (target: <500ms)"
                    echo "p99: ${duration.p99}ms (target: <1000ms)"

                    if (duration.p95 > 500) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }

    post {
        always {
            junit 'results/junit.xml'
            archiveArtifacts artifacts: 'results/**/*'
            publishHTML([
                reportDir: 'results',
                reportFiles: 'report.html',
                reportName: 'Performance Report'
            ])
        }
    }
}
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml

stages:
  - build
  - test
  - performance

build:
  stage: build
  image: node:20-alpine
  script:
    - cd apps/api-gateway && npm ci && npm run build
    - cd ../../apps/frontend && npm ci && npm run build
  artifacts:
    paths:
      - apps/api-gateway/dist
      - apps/frontend/out

performance_smoke:
  stage: performance
  image: grafana/k6:latest
  services:
    - postgres:15-alpine
    - redis:7-alpine
  environment:
    BASE_URL: http://api:4000
  script:
    - k6 run tests/performance/api-smoke-test.js --vus 1 --duration 30s
  allow_failure: true

performance_load:
  stage: performance
  image: grafana/k6:latest
  services:
    - postgres:15-alpine
    - redis:7-alpine
  environment:
    BASE_URL: http://api:4000
  script:
    - k6 run tests/performance/api-load-test.js --out json=results.json
  artifacts:
    reports:
      performance: results.json
  only:
    - main
    - develop
```

## Cloud-Native Integration

### AWS CodePipeline

```yaml
# buildspec.yml for AWS CodeBuild

version: 0.2

phases:
  install:
    commands:
      - echo "Installing k6..."
      - curl https://dl.k6.io/install/linux.sh | bash
      - k6 version

  build:
    commands:
      - echo "Running performance tests..."
      - k6 run tests/performance/api-load-test.js --out json=results.json

  post_build:
    commands:
      - echo "Performance tests completed"
      - aws s3 cp results.json s3://performance-results-bucket/

artifacts:
  files:
    - results.json
```

## Continuous Monitoring

### Integration with Grafana Cloud

```bash
# Run tests and send results to Grafana Cloud

k6 run api-load-test.js \
  --out cloud \
  --cloud-name "Production - Daily" \
  --cloud-project-id 123456
```

## Performance Baseline Tracking

```bash
#!/bin/bash
# track-performance.sh

RESULTS_DIR="performance-history"
mkdir -p $RESULTS_DIR

# Run tests
k6 run api-load-test.js --out json=current-results.json

# Save results with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp current-results.json "$RESULTS_DIR/results_$TIMESTAMP.json"

# Compare with baseline
python3 - <<EOF
import json
import os

with open('current-results.json', 'r') as f:
    current = json.load(f)

metrics = current['metrics']['http_req_duration']['values']

# Check against thresholds
if metrics['p95'] > 500:
    print("ALERT: p95 response time exceeded 500ms!")
    exit(1)
EOF
```

## Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running smoke test..."
k6 run tests/performance/api-smoke-test.js --vus 1 --duration 10s

if [ $? -ne 0 ]; then
    echo "Performance smoke test failed! Aborting commit."
    exit 1
fi
```

## Best Practices

1. **Run tests automatically** on every commit to main/develop
2. **Store historical data** to track performance trends
3. **Set realistic thresholds** based on production SLAs
4. **Alert on regression** when metrics exceed baselines
5. **Document changes** that impact performance
6. **Review monthly** to identify optimization opportunities

---

**Last Updated:** December 10, 2025
