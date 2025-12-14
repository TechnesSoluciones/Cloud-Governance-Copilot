/**
 * Database Query Performance Benchmark Script
 *
 * This script benchmarks common Azure-related database queries to measure
 * the performance improvements from the indexes added in the migration.
 *
 * Usage:
 *   npm run benchmark:queries
 *   OR
 *   ts-node scripts/benchmark-queries.ts
 *
 * Environment Variables Required:
 *   DATABASE_URL - PostgreSQL connection string
 *
 * Benchmark Categories:
 * 1. Cost Data Queries - Time-series, aggregations, service breakdowns
 * 2. Resource Inventory Queries - Filtering, location-based, type-based
 * 3. Recommendation Queries - Status, priority, savings-based
 * 4. Anomaly Detection Queries - Active anomalies, recent detection
 * 5. Dashboard Aggregation Queries - Multi-table joins and aggregations
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// ============================================================================
// Configuration
// ============================================================================

const prisma = new PrismaClient({
  log: ['error'], // Suppress query logs during benchmarking
});

// Number of times to run each query for averaging
const ITERATIONS = 10;

// Color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RED: '\x1b[31m',
};

// ============================================================================
// Types
// ============================================================================

interface BenchmarkResult {
  queryName: string;
  category: string;
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  recordsReturned: number;
}

interface BenchmarkSummary {
  totalQueries: number;
  totalTimeMs: number;
  avgQueryTimeMs: number;
  categories: {
    [category: string]: {
      queryCount: number;
      avgTimeMs: number;
    };
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format milliseconds to human-readable format
 */
function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Print a section header
 */
function printHeader(title: string): void {
  console.log('\n' + COLORS.BRIGHT + COLORS.CYAN + '='.repeat(80) + COLORS.RESET);
  console.log(COLORS.BRIGHT + COLORS.CYAN + title.padStart(40 + title.length / 2) + COLORS.RESET);
  console.log(COLORS.BRIGHT + COLORS.CYAN + '='.repeat(80) + COLORS.RESET + '\n');
}

/**
 * Print benchmark result
 */
function printResult(result: BenchmarkResult): void {
  const color = result.avgTimeMs < 50 ? COLORS.GREEN : result.avgTimeMs < 200 ? COLORS.YELLOW : COLORS.RED;

  console.log(COLORS.BRIGHT + result.queryName + COLORS.RESET);
  console.log(`  Category:        ${COLORS.BLUE}${result.category}${COLORS.RESET}`);
  console.log(`  Iterations:      ${result.iterations}`);
  console.log(`  Avg Time:        ${color}${formatTime(result.avgTimeMs)}${COLORS.RESET}`);
  console.log(`  Min/Max:         ${formatTime(result.minTimeMs)} / ${formatTime(result.maxTimeMs)}`);
  console.log(`  Records:         ${result.recordsReturned.toLocaleString()}`);
  console.log('');
}

/**
 * Run a benchmark for a specific query
 */
async function benchmark(
  queryName: string,
  category: string,
  queryFn: () => Promise<any[]>
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let recordsReturned = 0;

  // Warm-up run (not counted)
  await queryFn();

  // Benchmark runs
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const result = await queryFn();
    const end = performance.now();

    times.push(end - start);
    recordsReturned = result.length;
  }

  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / ITERATIONS;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    queryName,
    category,
    iterations: ITERATIONS,
    totalTimeMs: totalTime,
    avgTimeMs: avgTime,
    minTimeMs: minTime,
    maxTimeMs: maxTime,
    recordsReturned,
  };
}

// ============================================================================
// Benchmark Queries
// ============================================================================

/**
 * Category 1: Cost Data Queries
 */
async function benchmarkCostQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('COST DATA QUERIES');

  const results: BenchmarkResult[] = [];

  // Get date range for queries (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Query 1: Time-series cost data (last 30 days)
  results.push(
    await benchmark('Cost data - Last 30 days (time-series)', 'Cost Data', async () => {
      return await prisma.costData.findMany({
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    })
  );

  // Query 2: Cost breakdown by service
  results.push(
    await benchmark('Cost data - Group by service', 'Cost Data', async () => {
      const result = await prisma.costData.groupBy({
        by: ['service'],
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      });
      return result as any[];
    })
  );

  // Query 3: Cost by provider and service
  results.push(
    await benchmark('Cost data - Azure costs by service', 'Cost Data', async () => {
      return await prisma.costData.findMany({
        where: {
          tenantId,
          provider: 'azure',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          service: true,
          amount: true,
          currency: true,
        },
        orderBy: [{ date: 'desc' }, { amount: 'desc' }],
      });
    })
  );

  // Query 4: Top 10 highest cost days
  results.push(
    await benchmark('Cost data - Top 10 highest cost entries', 'Cost Data', async () => {
      return await prisma.costData.findMany({
        where: {
          tenantId,
          amount: {
            gt: 0,
          },
        },
        orderBy: {
          amount: 'desc',
        },
        take: 10,
      });
    })
  );

  // Query 5: Daily cost aggregation
  results.push(
    await benchmark('Cost data - Daily aggregation', 'Cost Data', async () => {
      const result = await prisma.costData.groupBy({
        by: ['date'],
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          date: 'desc',
        },
      });
      return result as any[];
    })
  );

  results.forEach(printResult);
  return results;
}

/**
 * Category 2: Resource Inventory Queries
 */
async function benchmarkResourceQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('RESOURCE INVENTORY QUERIES');

  const results: BenchmarkResult[] = [];

  // Query 1: All Azure resources
  results.push(
    await benchmark('Resources - All Azure resources', 'Resources', async () => {
      return await prisma.asset.findMany({
        where: {
          tenantId,
          provider: 'azure',
        },
        select: {
          id: true,
          name: true,
          resourceType: true,
          region: true,
          status: true,
        },
      });
    })
  );

  // Query 2: Resources by type (Virtual Machines)
  results.push(
    await benchmark('Resources - Filter by type (Virtual Machines)', 'Resources', async () => {
      return await prisma.asset.findMany({
        where: {
          tenantId,
          resourceType: 'Microsoft.Compute/virtualMachines',
        },
      });
    })
  );

  // Query 3: Resources by location
  results.push(
    await benchmark('Resources - Filter by location (eastus)', 'Resources', async () => {
      return await prisma.asset.findMany({
        where: {
          tenantId,
          region: 'eastus',
        },
        select: {
          id: true,
          name: true,
          resourceType: true,
          status: true,
        },
      });
    })
  );

  // Query 4: Active Azure resources
  results.push(
    await benchmark('Resources - Active Azure resources', 'Resources', async () => {
      return await prisma.asset.findMany({
        where: {
          tenantId,
          provider: 'azure',
          status: 'running',
        },
        select: {
          id: true,
          name: true,
          resourceType: true,
          region: true,
        },
      });
    })
  );

  // Query 5: Recently seen resources (orphan detection)
  results.push(
    await benchmark('Resources - Recently seen (last 7 days)', 'Resources', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return await prisma.asset.findMany({
        where: {
          tenantId,
          lastSeenAt: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          lastSeenAt: 'desc',
        },
        take: 100,
      });
    })
  );

  results.forEach(printResult);
  return results;
}

/**
 * Category 3: Recommendation Queries
 */
async function benchmarkRecommendationQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('RECOMMENDATION QUERIES');

  const results: BenchmarkResult[] = [];

  // Query 1: Open recommendations
  results.push(
    await benchmark('Recommendations - All open', 'Recommendations', async () => {
      return await prisma.costRecommendation.findMany({
        where: {
          tenantId,
          status: 'open',
        },
      });
    })
  );

  // Query 2: High priority recommendations
  results.push(
    await benchmark('Recommendations - Open + High priority', 'Recommendations', async () => {
      return await prisma.costRecommendation.findMany({
        where: {
          tenantId,
          status: 'open',
          priority: 'high',
        },
        orderBy: {
          priority: 'desc',
        },
      });
    })
  );

  // Query 3: Azure-specific recommendations
  results.push(
    await benchmark('Recommendations - Azure + Open', 'Recommendations', async () => {
      return await prisma.costRecommendation.findMany({
        where: {
          tenantId,
          provider: 'azure',
          status: 'open',
        },
        select: {
          id: true,
          title: true,
          priority: true,
          estimatedSavings: true,
        },
      });
    })
  );

  // Query 4: Top savings opportunities
  results.push(
    await benchmark('Recommendations - Top 10 savings', 'Recommendations', async () => {
      return await prisma.costRecommendation.findMany({
        where: {
          tenantId,
          status: 'open',
        },
        orderBy: {
          estimatedSavings: 'desc',
        },
        take: 10,
      });
    })
  );

  // Query 5: Recent recommendations
  results.push(
    await benchmark('Recommendations - Recent (last 30 days)', 'Recommendations', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return await prisma.costRecommendation.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    })
  );

  results.forEach(printResult);
  return results;
}

/**
 * Category 4: Anomaly Detection Queries
 */
async function benchmarkAnomalyQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('ANOMALY DETECTION QUERIES');

  const results: BenchmarkResult[] = [];

  // Query 1: Open anomalies
  results.push(
    await benchmark('Anomalies - All open', 'Anomalies', async () => {
      return await prisma.costAnomaly.findMany({
        where: {
          tenantId,
          status: 'open',
        },
      });
    })
  );

  // Query 2: Critical/High severity anomalies
  results.push(
    await benchmark('Anomalies - Open + Critical/High severity', 'Anomalies', async () => {
      return await prisma.costAnomaly.findMany({
        where: {
          tenantId,
          status: 'open',
          severity: {
            in: ['critical', 'high'],
          },
        },
        orderBy: {
          severity: 'desc',
        },
      });
    })
  );

  // Query 3: Recent anomalies (last 7 days)
  results.push(
    await benchmark('Anomalies - Recent (last 7 days)', 'Anomalies', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return await prisma.costAnomaly.findMany({
        where: {
          tenantId,
          detectedAt: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          detectedAt: 'desc',
        },
      });
    })
  );

  // Query 4: Azure-specific anomalies
  results.push(
    await benchmark('Anomalies - Azure + Open', 'Anomalies', async () => {
      return await prisma.costAnomaly.findMany({
        where: {
          tenantId,
          provider: 'azure',
          status: 'open',
        },
        select: {
          id: true,
          severity: true,
          detectedAt: true,
          expectedCost: true,
          actualCost: true,
          deviation: true,
        },
      });
    })
  );

  results.forEach(printResult);
  return results;
}

/**
 * Category 5: Dashboard Aggregation Queries
 */
async function benchmarkDashboardQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('DASHBOARD AGGREGATION QUERIES');

  const results: BenchmarkResult[] = [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Query 1: Multi-table dashboard overview
  results.push(
    await benchmark('Dashboard - Multi-table overview', 'Dashboard', async () => {
      const [costs, resources, recommendations, anomalies] = await Promise.all([
        prisma.costData.count({
          where: { tenantId, date: { gte: startDate, lte: endDate } },
        }),
        prisma.asset.count({
          where: { tenantId, provider: 'azure' },
        }),
        prisma.costRecommendation.count({
          where: { tenantId, status: 'open' },
        }),
        prisma.costAnomaly.count({
          where: { tenantId, status: 'open' },
        }),
      ]);
      return [{ costs, resources, recommendations, anomalies }];
    })
  );

  // Query 2: Cost aggregation with resource join
  results.push(
    await benchmark('Dashboard - Cost with resource details', 'Dashboard', async () => {
      return await prisma.costData.findMany({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          assetId: { not: null },
        },
        include: {
          asset: {
            select: {
              name: true,
              resourceType: true,
              region: true,
            },
          },
        },
        take: 100,
      });
    })
  );

  // Query 3: Security findings aggregation
  results.push(
    await benchmark('Dashboard - Security findings by severity', 'Dashboard', async () => {
      const result = await prisma.securityFinding.groupBy({
        by: ['severity'],
        where: {
          tenantId,
          provider: 'azure',
          status: 'open',
        },
        _count: {
          severity: true,
        },
      });
      return result as any[];
    })
  );

  results.forEach(printResult);
  return results;
}

/**
 * Category 6: Account and Audit Queries
 */
async function benchmarkAccountQueries(tenantId: string): Promise<BenchmarkResult[]> {
  printHeader('ACCOUNT & AUDIT QUERIES');

  const results: BenchmarkResult[] = [];

  // Query 1: Active cloud accounts
  results.push(
    await benchmark('Accounts - Active Azure accounts', 'Accounts', async () => {
      return await prisma.cloudAccount.findMany({
        where: {
          tenantId,
          provider: 'azure',
          status: 'active',
        },
        select: {
          id: true,
          accountName: true,
          accountIdentifier: true,
          lastSync: true,
        },
      });
    })
  );

  // Query 2: Recent audit logs by resource type
  results.push(
    await benchmark('Audit - Recent logs for resources', 'Audit', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return await prisma.auditLog.findMany({
        where: {
          tenantId,
          resourceType: { not: null },
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    })
  );

  // Query 3: Audit logs by action
  results.push(
    await benchmark('Audit - Filter by action (CREATE)', 'Audit', async () => {
      return await prisma.auditLog.findMany({
        where: {
          tenantId,
          action: 'CREATE',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
    })
  );

  results.forEach(printResult);
  return results;
}

// ============================================================================
// Summary and Report
// ============================================================================

/**
 * Generate benchmark summary
 */
function generateSummary(allResults: BenchmarkResult[]): BenchmarkSummary {
  const categories: { [key: string]: { queryCount: number; avgTimeMs: number } } = {};

  allResults.forEach((result) => {
    if (!categories[result.category]) {
      categories[result.category] = { queryCount: 0, avgTimeMs: 0 };
    }
    categories[result.category].queryCount++;
    categories[result.category].avgTimeMs += result.avgTimeMs;
  });

  Object.keys(categories).forEach((category) => {
    categories[category].avgTimeMs /= categories[category].queryCount;
  });

  const totalTime = allResults.reduce((sum, r) => sum + r.avgTimeMs, 0);

  return {
    totalQueries: allResults.length,
    totalTimeMs: totalTime,
    avgQueryTimeMs: totalTime / allResults.length,
    categories,
  };
}

/**
 * Print benchmark summary
 */
function printSummary(summary: BenchmarkSummary): void {
  printHeader('BENCHMARK SUMMARY');

  console.log(COLORS.BRIGHT + 'Overall Statistics:' + COLORS.RESET);
  console.log(`  Total Queries:    ${summary.totalQueries}`);
  console.log(`  Total Time:       ${formatTime(summary.totalTimeMs)}`);
  console.log(`  Avg Query Time:   ${COLORS.YELLOW}${formatTime(summary.avgQueryTimeMs)}${COLORS.RESET}\n`);

  console.log(COLORS.BRIGHT + 'By Category:' + COLORS.RESET);
  Object.entries(summary.categories).forEach(([category, stats]) => {
    const color = stats.avgTimeMs < 50 ? COLORS.GREEN : stats.avgTimeMs < 200 ? COLORS.YELLOW : COLORS.RED;
    console.log(
      `  ${category.padEnd(20)} ${stats.queryCount} queries, avg: ${color}${formatTime(stats.avgTimeMs)}${COLORS.RESET}`
    );
  });
  console.log('');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log(COLORS.BRIGHT + COLORS.BLUE);
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                           ║');
  console.log('║              DATABASE QUERY PERFORMANCE BENCHMARK                         ║');
  console.log('║              Azure Integration Performance Testing                        ║');
  console.log('║                                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.RESET);

  try {
    // Get a tenant to benchmark against
    const tenant = await prisma.tenant.findFirst({
      select: { id: true, name: true },
    });

    if (!tenant) {
      console.error(
        COLORS.RED +
          '\nError: No tenants found in database. Please seed the database first.' +
          COLORS.RESET
      );
      process.exit(1);
    }

    console.log(`\nBenchmarking queries for tenant: ${COLORS.BRIGHT}${tenant.name}${COLORS.RESET}`);
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Iterations per query: ${ITERATIONS}\n`);

    const allResults: BenchmarkResult[] = [];

    // Run all benchmark categories
    allResults.push(...(await benchmarkCostQueries(tenant.id)));
    allResults.push(...(await benchmarkResourceQueries(tenant.id)));
    allResults.push(...(await benchmarkRecommendationQueries(tenant.id)));
    allResults.push(...(await benchmarkAnomalyQueries(tenant.id)));
    allResults.push(...(await benchmarkDashboardQueries(tenant.id)));
    allResults.push(...(await benchmarkAccountQueries(tenant.id)));

    // Generate and print summary
    const summary = generateSummary(allResults);
    printSummary(summary);

    // Performance recommendations
    printHeader('PERFORMANCE RECOMMENDATIONS');
    const slowQueries = allResults.filter((r) => r.avgTimeMs > 200);
    if (slowQueries.length > 0) {
      console.log(COLORS.YELLOW + `Found ${slowQueries.length} queries with avg time > 200ms:\n` + COLORS.RESET);
      slowQueries.forEach((query) => {
        console.log(`  - ${query.queryName}: ${COLORS.RED}${formatTime(query.avgTimeMs)}${COLORS.RESET}`);
      });
      console.log('\nConsider adding additional indexes or optimizing these queries.\n');
    } else {
      console.log(COLORS.GREEN + 'All queries performing well! (avg < 200ms)' + COLORS.RESET + '\n');
    }

    console.log(COLORS.BRIGHT + COLORS.GREEN + 'Benchmark completed successfully!' + COLORS.RESET + '\n');
  } catch (error: any) {
    console.error(COLORS.RED + '\nBenchmark failed:' + COLORS.RESET, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the benchmark
main();
