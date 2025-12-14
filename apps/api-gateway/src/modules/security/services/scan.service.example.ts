/**
 * Security Scan Service - Usage Examples
 *
 * This file demonstrates how to use the SecurityScanService to orchestrate
 * security scanning across AWS and Azure accounts.
 *
 * @module modules/security/services/scan.service.example
 */

import { SecurityScanService } from './scan.service';

/**
 * Example 1: Scan all active accounts for a tenant
 */
async function scanAllTenantAccounts() {
  const scanService = new SecurityScanService();

  try {
    const tenantId = 'tenant-123';

    // Scan all active accounts
    const result = await scanService.runScan(tenantId);

    console.log('Scan Summary:');
    console.log(`- Accounts Scanned: ${result.accountsScanned}`);
    console.log(`- Total Findings: ${result.totalFindings}`);
    console.log(`- Critical: ${result.criticalCount}`);
    console.log(`- High: ${result.highCount}`);
    console.log(`- Medium: ${result.mediumCount}`);
    console.log(`- Low: ${result.lowCount}`);
    console.log(`- Duration: ${result.duration}ms`);
  } catch (error) {
    console.error('Scan failed:', error);
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 2: Scan a specific cloud account
 */
async function scanSpecificAccount() {
  const scanService = new SecurityScanService();

  try {
    const tenantId = 'tenant-123';
    const accountId = 'account-456';

    // Scan specific account only
    const result = await scanService.runScan(tenantId, accountId);

    console.log(`Scan completed for account ${accountId}`);
    console.log(`Found ${result.totalFindings} security findings`);
  } catch (error) {
    console.error('Account scan failed:', error);
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 3: Listen for security events
 */
async function scanWithEventHandling() {
  const scanService = new SecurityScanService();

  // Listen for critical/high severity findings
  scanService.on('security.finding.created', (event) => {
    console.log('SECURITY ALERT:');
    console.log(`- Severity: ${event.severity}`);
    console.log(`- Title: ${event.title}`);
    console.log(`- Resource: ${event.resourceId}`);
    console.log(`- Category: ${event.category}`);

    // Send alert to security team
    // sendSlackNotification(event);
    // sendEmailAlert(event);
    // createJiraTicket(event);
  });

  try {
    const tenantId = 'tenant-123';
    await scanService.runScan(tenantId);
  } catch (error) {
    console.error('Scan failed:', error);
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 4: Scheduled security scanning (daily)
 */
async function scheduledDailyScan() {
  const scanService = new SecurityScanService();

  try {
    // Get all active tenants (from database)
    const tenants = ['tenant-1', 'tenant-2', 'tenant-3'];

    for (const tenantId of tenants) {
      console.log(`Starting scan for tenant: ${tenantId}`);

      try {
        const result = await scanService.runScan(tenantId);

        console.log(`Tenant ${tenantId} scan completed:`);
        console.log(`- ${result.totalFindings} findings`);
        console.log(`- ${result.criticalCount} critical, ${result.highCount} high`);

        // Store metrics for reporting
        // await saveMetrics(tenantId, result);
      } catch (error) {
        console.error(`Failed to scan tenant ${tenantId}:`, error);
        // Continue with next tenant
      }
    }
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 5: Integration with Express API endpoint
 */
import type { Request, Response } from 'express';

async function scanAccountEndpoint(req: Request, res: Response) {
  const scanService = new SecurityScanService();

  try {
    const { tenantId, accountId } = req.params;

    // Start scan
    const result = await scanService.runScan(tenantId, accountId);

    res.json({
      success: true,
      data: {
        scanId: result.scanId,
        accountsScanned: result.accountsScanned,
        findings: {
          total: result.totalFindings,
          critical: result.criticalCount,
          high: result.highCount,
          medium: result.mediumCount,
          low: result.lowCount,
        },
        duration: result.duration,
      },
    });
  } catch (error: any) {
    console.error('Scan endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 6: Scan with custom alerting for critical findings
 */
async function scanWithAlertingThresholds() {
  const scanService = new SecurityScanService();

  // Track critical findings in real-time
  const criticalFindings: any[] = [];

  scanService.on('security.finding.created', (event) => {
    if (event.severity === 'critical') {
      criticalFindings.push(event);

      // Immediate alert for critical findings
      console.log('CRITICAL SECURITY FINDING DETECTED:');
      console.log(JSON.stringify(event, null, 2));

      // Send immediate notifications
      // sendPagerDutyAlert(event);
      // sendSlackAlert(event);
    }
  });

  try {
    const tenantId = 'tenant-123';
    const result = await scanService.runScan(tenantId);

    // Check alerting thresholds
    if (result.criticalCount > 10) {
      console.log('ALERT: More than 10 critical findings detected!');
      console.log('Critical findings:', criticalFindings);
      // Escalate to security team
    }

    if (result.highCount > 50) {
      console.log('WARNING: High number of high-severity findings');
      // Send summary report
    }

    return result;
  } catch (error) {
    console.error('Scan failed:', error);
    throw error;
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 7: Compare scan results over time
 */
async function compareScanResults() {
  const scanService = new SecurityScanService();

  try {
    const tenantId = 'tenant-123';

    // Get previous scan results from database
    // const previousScan = await getPreviousScanResults(tenantId);

    // Run new scan
    const currentScan = await scanService.runScan(tenantId);

    // Compare results
    console.log('Scan Comparison:');
    console.log(`Current: ${currentScan.totalFindings} findings`);
    // console.log(`Previous: ${previousScan.totalFindings} findings`);
    // console.log(`Difference: ${currentScan.totalFindings - previousScan.totalFindings}`);

    // Track improvement/degradation
    // if (currentScan.criticalCount > previousScan.criticalCount) {
    //   console.log('WARNING: Security posture has degraded!');
    // } else if (currentScan.criticalCount < previousScan.criticalCount) {
    //   console.log('IMPROVEMENT: Critical findings reduced');
    // }

    return currentScan;
  } finally {
    await scanService.disconnect();
  }
}

/**
 * Example 8: Multi-account scan with parallel processing
 *
 * Note: Current implementation processes accounts sequentially.
 * This example shows how you could extend it for parallel processing.
 */
async function parallelMultiAccountScan() {
  const scanService = new SecurityScanService();

  try {
    const tenantId = 'tenant-123';

    // For true parallel processing, you could:
    // 1. Query all accounts
    // 2. Create separate scan service instances
    // 3. Use Promise.all() to scan in parallel

    // Current implementation (sequential):
    const result = await scanService.runScan(tenantId);

    console.log(`Scanned ${result.accountsScanned} accounts in ${result.duration}ms`);
    console.log(`Average: ${Math.round(result.duration / result.accountsScanned)}ms per account`);

    return result;
  } finally {
    await scanService.disconnect();
  }
}

// Export examples for documentation
export {
  scanAllTenantAccounts,
  scanSpecificAccount,
  scanWithEventHandling,
  scheduledDailyScan,
  scanAccountEndpoint,
  scanWithAlertingThresholds,
  compareScanResults,
  parallelMultiAccountScan,
};
