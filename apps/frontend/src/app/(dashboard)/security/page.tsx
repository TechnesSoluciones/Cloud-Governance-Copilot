'use client';

/**
 * Security Dashboard Page
 *
 * Comprehensive security dashboard for Cloud Governance Copilot
 * Features:
 * - Security score overview with circular gauge
 * - Critical and high severity findings summary
 * - Compliance status across multiple standards
 * - Security trends and charts
 * - Detailed assessments table with filters
 * - Account selector (multi-tenant support)
 * - Real-time data refresh
 * - Export capabilities
 * - Full accessibility (WCAG 2.1 AA)
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │  Security Overview                       │
 * │  ┌──────────┐  ┌──────────┐  ┌────────┐│
 * │  │  Score   │  │ Critical │  │ High   ││
 * │  │   85     │  │    3     │  │   12   ││
 * │  └──────────┘  └──────────┘  └────────┘│
 * ├─────────────────────────────────────────┤
 * │  ┌───────────────┐  ┌─────────────────┐│
 * │  │ Assessments   │  │ Compliance      ││
 * │  │ (Table)       │  │ (Cards)         ││
 * │  └───────────────┘  └─────────────────┘│
 * ├─────────────────────────────────────────┤
 * │  Security Trends (Charts)               │
 * └─────────────────────────────────────────┘
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  Shield,
  AlertCircle,
  RefreshCw,
  AlertOctagon,
  AlertTriangle,
  Activity,
  Calendar,
  Server,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_BACKGROUNDS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS
} from '@/components/shared/premium';
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
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

// Import components
import { AssessmentsList } from '@/components/security/AssessmentsList';
import { SecurityFindingModal } from '@/components/security/SecurityFindingModal';
import { PermissionDeniedError } from '@/components/errors/PermissionDeniedError';
import { CircuitBreakerError as CircuitBreakerErrorComponent } from '@/components/errors/CircuitBreakerError';
import { analyzePermissionError, getErrorFromQueryError } from '@/lib/errors';
import { isCircuitBreakerError } from '@/lib/api/client';

const ITEMS_PER_PAGE = 20;
const POLLING_INTERVAL = 30000; // 30 seconds

/**
 * Stat Card for overview metrics
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  iconBg,
  subtitle,
}) => (
  <Card className="p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${iconBg}`}>
        <div className={iconColor}>{icon}</div>
      </div>
    </div>
  </Card>
);

/**
 * Main Security Dashboard Page
 */
export default function SecurityPage() {
  const { addToast } = useToast();
  const router = useRouter();

  // Get user's cloud accounts using centralized hook
  const {
    cloudAccounts,
    selectedAccount,
    isLoading: accountsLoading,
  } = useCloudAccounts();

  // State
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScanActive, setIsScanActive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Show empty state when no cloud accounts are configured
  if (!accountsLoading && cloudAccounts.length === 0) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          <PremiumSectionHeader
            title="Security Dashboard"
            subtitle="Monitor and manage your cloud security posture"
          />
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                <Server className="h-12 w-12 text-orange-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">No Cloud Accounts Connected</h3>
                <p className="text-muted-foreground">
                  Connect your first cloud account to start monitoring your security posture.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push('/cloud-accounts/new')}
                className="shadow-lg"
              >
                <Icons.plus className="h-5 w-5 mr-2" />
                Add Cloud Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch data
  const {
    data: summaryResponse,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useSummary({
    refetchInterval: isScanActive ? POLLING_INTERVAL : false,
  });

  const {
    data: findingsResponse,
    isLoading: isLoadingFindings,
    error: findingsError,
    refetch: refetchFindings,
  } = useFindings(
    {
      cloudAccountId: selectedAccount?.id,
      status: 'open',
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortBy: 'severity',
      sortOrder: 'desc',
    },
    {
      refetchInterval: isScanActive ? POLLING_INTERVAL : false,
    }
  );

  const {
    data: scansResponse,
    error: scansError,
    refetch: refetchScans,
  } = useScans(
    {
      page: 1,
      limit: 5,
    },
    {
      refetchInterval: isScanActive ? POLLING_INTERVAL : false,
    }
  );

  const {
    mutate: triggerScan,
    isPending: isTriggering,
    isSuccess: scanSuccess,
  } = useTriggerScan();

  // Extract data
  const summaryData = extractSummaryData(summaryResponse);
  const findingsData = extractFindingsData(findingsResponse);
  const scansData = extractScansData(scansResponse);

  const findings = findingsData?.data || [];
  const totalCount = findingsData?.meta.total || 0;
  const totalPages = findingsData?.meta.totalPages || 1;

  // Check for active scans
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

  // Calculate security score (mock calculation from summary data)
  const calculateSecurityScore = (): number => {
    if (!summaryData || !summaryData.totalFindings || summaryData.totalFindings === 0) return 100;

    const totalFindings = summaryData.totalFindings;
    const criticalWeight = 10;
    const highWeight = 5;
    const mediumWeight = 2;
    const lowWeight = 1;

    const weightedFindings =
      (summaryData.criticalCount || 0) * criticalWeight +
      (summaryData.highCount || 0) * highWeight +
      (summaryData.mediumCount || 0) * mediumWeight +
      (summaryData.lowCount || 0) * lowWeight;

    // Normalize to 0-100 scale (assuming max 100 findings with critical severity)
    const maxPossibleScore = 100 * criticalWeight;
    const score = Math.max(0, 100 - (weightedFindings / maxPossibleScore) * 100);

    return Math.round(score);
  };

  const securityScore = calculateSecurityScore();

  // Note: scoreBreakdown, complianceResults, and trend data require dedicated backend endpoints
  // These features will be available once the backend APIs are implemented

  // Handlers
  const handleTriggerScan = () => {
    triggerScan(
      { cloudAccountId: selectedAccount?.id },
      {
        onSuccess: (data) => {
          if (data.success) {
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
        onError: () => {
          addToast('Failed to trigger security scan. Please try again.', 'error');
        },
      }
    );
  };

  const handleRefresh = () => {
    refetchFindings();
    refetchSummary();
    setLastRefresh(new Date());
    addToast('Dashboard refreshed', 'success');
  };

  const handleFindingClick = (finding: Finding) => {
    setSelectedFinding(finding);
  };

  const handleModalClose = () => {
    setSelectedFinding(null);
    refetchFindings();
    refetchSummary();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check for authentication and permission errors
  const errorToAnalyze = findingsError || summaryError || scansError;
  const actualError = errorToAnalyze ? getErrorFromQueryError(errorToAnalyze) : null;
  const permissionErrorInfo = actualError ? analyzePermissionError(actualError) : null;
  const hasAuthError =
    (findingsError && findingsError.message?.includes('authentication')) ||
    (summaryError && summaryError.message?.includes('authentication')) ||
    (scansError && scansError.message?.includes('authentication'));

  // Show circuit breaker error state
  if (actualError && isCircuitBreakerError(actualError)) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          <PremiumSectionHeader
            title="Security Dashboard"
            subtitle="Monitor and manage your cloud security posture"
          />
          <CircuitBreakerErrorComponent
            error={actualError}
            onRetry={() => {
              refetchSummary();
              refetchFindings();
              refetchScans();
            }}
          />
        </div>
      </div>
    );
  }

  // Show permission denied error state
  if (permissionErrorInfo?.isPermissionError) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          <PremiumSectionHeader
            title="Security Dashboard"
            subtitle="Monitor and manage your cloud security posture"
          />
          <PermissionDeniedError
            errorInfo={permissionErrorInfo}
            onRetry={() => {
              refetchSummary();
              refetchFindings();
            }}
          />
        </div>
      </div>
    );
  }

  // Show authentication error state
  if (hasAuthError) {
    return (
      <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
        <div className="space-y-8 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
          <PremiumSectionHeader
            title="Security Dashboard"
            subtitle="Monitor and manage your cloud security posture"
          />
          <Card className="p-12 text-center border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-100">Authentication Required</h3>
                <p className="text-red-700 dark:text-red-300">
                  Your session may have expired. Please sign in again to access security data.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push('/auth/signin')}
                className="shadow-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Security Dashboard"
          subtitle="Monitor and manage your cloud security posture"
          actions={
            <>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoadingSummary || isLoadingFindings}
                aria-label="Refresh dashboard"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    isLoadingSummary || isLoadingFindings ? 'animate-spin' : ''
                  }`}
                  aria-hidden="true"
                />
                Refresh
              </Button>
              <Button
                onClick={handleTriggerScan}
                disabled={isTriggering || isScanActive}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg"
              >
                {isTriggering || isScanActive ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    {isTriggering ? 'Starting...' : 'Scanning...'}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                    Run Security Scan
                  </>
                )}
              </Button>
            </>
          }
        />

        {/* Scan Active Banner */}
        {isScanActive && (
          <Card className="p-4 border-l-4 border-brand-orange bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-start gap-3">
              <RefreshCw
                className="h-5 w-5 text-brand-orange flex-shrink-0 animate-spin"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Security Scan in Progress
                </h3>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                  Scanning your cloud infrastructure. The dashboard will automatically update every 30 seconds.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Premium Stats Bar - Security KPIs */}
        {!isLoadingSummary && (
          <PremiumStatsBar
            stats={[
              {
                label: 'Total Findings',
                value: summaryData?.totalFindings || 0,
                icon: <Shield className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: `${summaryData?.openCount || 0} open, ${summaryData?.resolvedCount || 0} resolved`,
              },
              {
                label: 'Critical',
                value: summaryData?.criticalCount || 0,
                icon: <AlertOctagon className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.error,
                iconColor: PREMIUM_ICON_COLORS.error,
                subtitle: 'Immediate action required',
              },
              {
                label: 'High Priority',
                value: summaryData?.highCount || 0,
                icon: <AlertTriangle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.warning,
                iconColor: PREMIUM_ICON_COLORS.warning,
                subtitle: 'Priority resolution',
              },
              {
                label: 'Last Scan',
                value: summaryData?.lastScanDate
                  ? formatDistanceToNow(new Date(summaryData.lastScanDate), { addSuffix: true })
                  : 'Never',
                icon: <Activity className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.info,
                iconColor: PREMIUM_ICON_COLORS.info,
                subtitle: summaryData?.lastScanDate ? 'Completed' : 'No scans yet',
              },
            ]}
          />
        )}

        {/* Overview Section */}
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoadingSummary ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </Card>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="Total Findings"
                  value={summaryData?.totalFindings || 0}
                  icon={<Shield className="h-6 w-6" aria-hidden="true" />}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100 dark:bg-blue-900/30"
                  subtitle={`${summaryData?.openCount || 0} open, ${summaryData?.resolvedCount || 0} resolved`}
                />
                <StatCard
                  title="Critical"
                  value={summaryData?.criticalCount || 0}
                  icon={<AlertOctagon className="h-6 w-6" aria-hidden="true" />}
                  iconColor="text-red-600 dark:text-red-400"
                  iconBg="bg-red-100 dark:bg-red-900/30"
                  subtitle="Immediate action required"
                />
                <StatCard
                  title="High Severity"
                  value={summaryData?.highCount || 0}
                  icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
                  iconColor="text-orange-600 dark:text-orange-400"
                  iconBg="bg-orange-100 dark:bg-orange-900/30"
                  subtitle="Priority resolution"
                />
                <StatCard
                  title="Last Scan"
                  value={
                    summaryData?.lastScanDate
                      ? formatDistanceToNow(new Date(summaryData.lastScanDate), {
                          addSuffix: true,
                        })
                      : 'Never'
                  }
                  icon={<Activity className="h-6 w-6" aria-hidden="true" />}
                  iconColor="text-purple-600 dark:text-purple-400"
                  iconBg="bg-purple-100 dark:bg-purple-900/30"
                  subtitle={summaryData?.lastScanDate ? 'Completed' : 'No scans yet'}
                />
              </>
            )}
          </div>
        </div>

        {/* Main Content - Assessments List */}
        <AssessmentsList
          assessments={findings}
          isLoading={isLoadingFindings}
          onAssessmentClick={handleFindingClick}
          pagination={{
            page: currentPage,
            totalPages,
            onPageChange: handlePageChange,
          }}
        />

        {/* Error State - This is a fallback inline error (main permission errors are handled above) */}
        {findingsError && !permissionErrorInfo?.isPermissionError && (
          <Card className="p-6 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Error Loading Data
                </h3>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                  There was an error loading security data. Please try refreshing the page.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Finding Detail Modal */}
      <SecurityFindingModal finding={selectedFinding} onClose={handleModalClose} />
    </div>
  );
}
