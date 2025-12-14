'use client';

/**
 * Security Page
 *
 * Main page for viewing and managing security findings
 * Features:
 * - Security summary cards (total findings, critical, high, medium, low counts)
 * - Filters for severity, category, status, cloud account
 * - Button to trigger new security scan
 * - SecurityFindingsTable component with findings
 * - FindingDetailModal for viewing/resolving/dismissing findings
 * - Real-time polling every 30 seconds when scans are running
 * - Empty states and error handling
 * - Loading states with skeletons
 * - Responsive design
 * - WCAG 2.1 AA accessibility compliance
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { StatCardGridSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import {
  useFindings,
  useSummary,
  useScans,
  useTriggerScan,
  extractFindingsData,
  extractSummaryData,
  extractScansData,
} from '@/hooks/useSecurity';
import { Finding } from '@/lib/api/security';
import { SecuritySummary } from '@/components/security/SecuritySummary';
import { SecurityFilters, SecurityFiltersState } from '@/components/security/SecurityFilters';
import { SecurityFindingsTable } from '@/components/security/SecurityFindingsTable';
import { FindingDetailModal } from '@/components/security/FindingDetailModal';

const ITEMS_PER_PAGE = 20;
const POLLING_INTERVAL_DURING_SCAN = 30000; // 30 seconds

export default function SecurityPage() {
  const { addToast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<SecurityFiltersState>({
    status: 'open',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // Scan state
  const [isScanActive, setIsScanActive] = useState(false);

  // Fetch summary
  const {
    data: summaryResponse,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useSummary({
    refetchInterval: isScanActive ? POLLING_INTERVAL_DURING_SCAN : false,
  });

  // Fetch findings with filters
  const {
    data: findingsResponse,
    isLoading: isLoadingFindings,
    error: findingsError,
    refetch: refetchFindings,
  } = useFindings(
    {
      ...filters,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortBy: 'detectedAt',
      sortOrder: 'desc',
    },
    {
      refetchInterval: isScanActive ? POLLING_INTERVAL_DURING_SCAN : false,
    }
  );

  // Fetch recent scans to check for active scans
  const { data: scansResponse } = useScans(
    {
      page: 1,
      limit: 5,
    },
    {
      refetchInterval: isScanActive ? POLLING_INTERVAL_DURING_SCAN : false,
    }
  );

  // Trigger scan mutation
  const {
    mutate: triggerScan,
    isPending: isTriggering,
    isSuccess: scanSuccess,
    isError: scanError,
  } = useTriggerScan();

  // Extract data
  const summaryData = extractSummaryData(summaryResponse);
  const findingsData = extractFindingsData(findingsResponse);
  const scansData = extractScansData(scansResponse);

  const findings = findingsData?.data || [];
  const totalCount = findingsData?.meta.total || 0;
  const totalPages = findingsData?.meta.totalPages || 1;

  // Check if there are any active scans
  useEffect(() => {
    if (scansData?.data) {
      const hasActiveScan = scansData.data.some(
        (scan) => scan.status === 'pending' || scan.status === 'in_progress'
      );
      if (hasActiveScan && !isScanActive) {
        setIsScanActive(true);
      } else if (!hasActiveScan && isScanActive && !scanSuccess) {
        setIsScanActive(false);
      }
    }
  }, [scansData, isScanActive, scanSuccess]);

  // Handle scan trigger
  const handleTriggerScan = () => {
    triggerScan(
      {},
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            addToast('Security scan initiated successfully. Results will appear shortly.', 'success');
            setIsScanActive(true);
            refetchFindings();
            refetchSummary();

            // Stop polling after 5 minutes
            setTimeout(() => {
              setIsScanActive(false);
            }, 5 * 60 * 1000);
          }
        },
        onError: (error) => {
          addToast('Failed to trigger security scan. Please try again.', 'error');
        },
      }
    );
  };

  // Handle finding click
  const handleFindingClick = (finding: Finding) => {
    setSelectedFinding(finding);
  };

  // Handle modal close
  const handleModalClose = () => {
    setSelectedFinding(null);
    // Refetch findings in case the finding was resolved/dismissed
    refetchFindings();
    refetchSummary();
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: SecurityFiltersState) => {
    setFilters(newFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.severity, filters.category, filters.status, filters.cloudAccountId]);

  // Auto-stop scan polling after success
  useEffect(() => {
    if (scanSuccess) {
      // Keep polling for 2 minutes after scan completes
      const timer = setTimeout(() => {
        setIsScanActive(false);
      }, 2 * 60 * 1000);

      return () => clearTimeout(timer);
    }
  }, [scanSuccess]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Security Findings
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage security vulnerabilities across your cloud infrastructure
            </p>
          </div>
          <Button
            onClick={handleTriggerScan}
            disabled={isTriggering || isScanActive}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white"
          >
            {isTriggering || isScanActive ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                {isTriggering ? 'Starting Scan...' : 'Scan Running...'}
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                Run Security Scan
              </>
            )}
          </Button>
        </div>

        {/* Scan Active Banner */}
        {isScanActive && (
          <Card className="p-4 border-l-4 border-brand-orange bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-start gap-3">
              <RefreshCw
                className="h-5 w-5 text-brand-orange flex-shrink-0 animate-spin"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  Security Scan in Progress
                </h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  The system is scanning your cloud infrastructure for security vulnerabilities. The
                  findings will automatically update every 30 seconds.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Cards - Show skeleton if loading */}
        {isLoadingSummary ? (
          <StatCardGridSkeleton count={4} />
        ) : (
          <SecuritySummary summary={summaryData} isLoading={false} />
        )}

        {/* Filters */}
        <SecurityFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          categories={[
            'Access Control',
            'Authentication',
            'Authorization',
            'Data Protection',
            'Encryption',
            'Identity Management',
            'Logging & Monitoring',
            'Network Security',
            'Resource Configuration',
            'Secrets Management',
            'Storage Security',
            'Vulnerability',
          ]}
          cloudAccounts={[]}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {findings.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{totalCount}</span>{' '}
            findings
          </p>
        </div>

        {/* Error State */}
        {findingsError && (
          <Card className="p-6 border-l-4 border-error bg-error/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-error flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  Error Loading Findings
                </h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  There was an error loading your security findings. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetchFindings()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Findings Table */}
        <SecurityFindingsTable
          findings={findings}
          isLoading={isLoadingFindings}
          onFindingClick={handleFindingClick}
          pagination={{
            page: currentPage,
            totalPages,
            onPageChange: handlePageChange,
          }}
        />

        {/* Empty State (when no filters and no findings) */}
        {!isLoadingFindings &&
          !findingsError &&
          findings.length === 0 &&
          !filters.severity &&
          !filters.category &&
          !filters.cloudAccountId &&
          filters.status === 'open' && (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Shield className="h-12 w-12 text-gray-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    No security findings yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    Run a security scan to identify potential vulnerabilities and security issues in
                    your cloud infrastructure.
                  </p>
                </div>
                <Button
                  onClick={handleTriggerScan}
                  disabled={isTriggering}
                  className="bg-brand-orange hover:bg-brand-orange-dark text-white mt-2"
                >
                  <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                  Run Security Scan
                </Button>
              </div>
            </Card>
          )}
      </div>

      {/* Finding Detail Modal */}
      <FindingDetailModal finding={selectedFinding} onClose={handleModalClose} />
    </div>
  );
}
