/**
 * Example usage of AnomalyDetectionService
 *
 * This file demonstrates how to use the AnomalyDetectionService to detect
 * cost anomalies in your cloud spending.
 *
 * @module FinOps/Examples
 */

import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../../shared/events/event-bus';
import { AnomalyDetectionService } from './anomaly-detection.service';

// ============================================================
// Example 1: Analyze Yesterday's Costs
// ============================================================

async function example1_analyzeYesterday() {
  const prisma = new PrismaClient();
  const service = new AnomalyDetectionService(prisma, eventBus);

  try {
    // Analyze yesterday's costs for a specific tenant and cloud account
    const result = await service.analyzeRecentCosts(
      'tenant-id-123',
      'cloud-account-id-456'
      // date is optional - defaults to yesterday
    );

    console.log(`Analysis complete:`);
    console.log(`- Anomalies detected: ${result.anomaliesDetected}`);
    console.log(`- Anomalies:`, result.anomalies);

    // Example output:
    // Analysis complete:
    // - Anomalies detected: 2
    // - Anomalies: [
    //     {
    //       id: 'anomaly-1',
    //       service: 'EC2',
    //       expectedCost: 100.00,
    //       actualCost: 250.00,
    //       deviation: 150.00,
    //       severity: 'medium'
    //     },
    //     {
    //       id: 'anomaly-2',
    //       service: 'RDS',
    //       expectedCost: 50.00,
    //       actualCost: 400.00,
    //       deviation: 700.00,
    //       severity: 'critical'
    //     }
    //   ]
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 2: Analyze Specific Date
// ============================================================

async function example2_analyzeSpecificDate() {
  const prisma = new PrismaClient();
  const service = new AnomalyDetectionService(prisma, eventBus);

  try {
    // Analyze costs for a specific date
    const analysisDate = new Date('2024-01-15');

    const result = await service.analyzeRecentCosts(
      'tenant-id-123',
      'cloud-account-id-456',
      analysisDate
    );

    console.log(`Analyzed ${analysisDate.toISOString()}`);
    console.log(`Found ${result.anomaliesDetected} anomalies`);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 3: Query Anomalies with Filters
// ============================================================

async function example3_queryAnomalies() {
  const prisma = new PrismaClient();
  const service = new AnomalyDetectionService(prisma, eventBus);

  try {
    // Get all open critical anomalies
    const criticalAnomalies = await service.getAnomaliesForTenant('tenant-id-123', {
      status: 'open',
      severity: 'critical',
    });

    console.log(`Found ${criticalAnomalies.length} open critical anomalies`);

    // Get anomalies for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const recentAnomalies = await service.getAnomaliesForTenant('tenant-id-123', {
      startDate,
    });

    console.log(`Found ${recentAnomalies.length} anomalies in the last 30 days`);

    // Get anomalies for a specific service
    const ec2Anomalies = await service.getAnomaliesForTenant('tenant-id-123', {
      service: 'EC2',
      status: 'open',
    });

    console.log(`Found ${ec2Anomalies.length} open EC2 anomalies`);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 4: Subscribe to Anomaly Events
// ============================================================

async function example4_subscribeToEvents() {
  const prisma = new PrismaClient();
  const service = new AnomalyDetectionService(prisma, eventBus);

  // Subscribe to anomaly detection events
  eventBus.onCostAnomalyDetected(async (data) => {
    console.log('Cost anomaly detected!');
    console.log(`- Tenant: ${data.tenantId}`);
    console.log(`- Service: ${data.service}`);
    console.log(`- Severity: ${data.severity}`);
    console.log(`- Expected: $${data.expectedCost.toFixed(2)}`);
    console.log(`- Actual: $${data.actualCost.toFixed(2)}`);
    console.log(`- Deviation: ${((data.actualCost - data.expectedCost) / data.expectedCost * 100).toFixed(2)}%`);

    // You could:
    // - Create an incident in the Incidents module
    // - Send an email alert
    // - Post to Slack
    // - Trigger a workflow
  });

  try {
    // Run analysis (will trigger events for detected anomalies)
    await service.analyzeRecentCosts('tenant-id-123', 'cloud-account-id-456');
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 5: Scheduled Analysis (Cron Job)
// ============================================================

async function example5_scheduledAnalysis() {
  const prisma = new PrismaClient();
  const service = new AnomalyDetectionService(prisma, eventBus);

  try {
    // Get all active cloud accounts
    const accounts = await prisma.cloudAccount.findMany({
      where: { status: 'active' },
      include: { tenant: true },
    });

    console.log(`Analyzing ${accounts.length} cloud accounts...`);

    // Analyze each account
    for (const account of accounts) {
      console.log(`\nAnalyzing account: ${account.accountName} (${account.provider})`);

      const result = await service.analyzeRecentCosts(
        account.tenantId,
        account.id
      );

      console.log(`  ✓ Found ${result.anomaliesDetected} anomalies`);
    }

    console.log('\nScheduled analysis complete!');
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Run Examples
// ============================================================

// Uncomment to run specific examples:
// example1_analyzeYesterday();
// example2_analyzeSpecificDate();
// example3_queryAnomalies();
// example4_subscribeToEvents();
// example5_scheduledAnalysis();
