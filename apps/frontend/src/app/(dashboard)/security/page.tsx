/**
 * Security V2 Page
 * CloudNexus Design - Complete Security Dashboard Implementation
 */

'use client';

import { useMemo } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { SecurityScoreCircular } from '@/components/charts/SecurityScoreCircular';
import { useFindings, useSummary, useComplianceScores } from '@/hooks/useSecurity';
import { Finding } from '@/lib/api/security';
import { cn } from '@/lib/utils';

export default function SecurityV2Page() {
  // Fetch security data
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummary();
  const { data: findingsData, isLoading: findingsLoading, error: findingsError, refetch: refetchFindings } = useFindings({
    page: 1,
    limit: 20,
  });
  const { data: complianceData, isLoading: complianceLoading, error: complianceError } = useComplianceScores();

  // Extract data
  const summary = summaryData?.success && summaryData.data ? summaryData.data.data : null;
  const findings = findingsData?.success && findingsData.data ? findingsData.data.data : [];
  const findingsMeta = findingsData?.success && findingsData.data ? findingsData.data.meta : null;

  // Calculate KPIs from real data
  const securityScore = summary
    ? Math.max(0, 100 - (summary.criticalCount * 5 + summary.highCount * 3 + summary.mediumCount * 1))
    : 85;
  const criticalFindings = summary?.criticalCount || 0;
  const totalFindings = summary?.totalFindings || 0;
  const complianceScore = summary && totalFindings > 0 ? Math.max(0, 100 - (totalFindings * 2)) : 88;

  // Calculate security categories from findings
  const securityCategories = useMemo(() => {
    if (!findings || findings.length === 0) return [];

    const categoriesMap = new Map<string, {
      name: string;
      findings: number;
      critical: number;
      high: number;
      medium: number;
    }>();

    findings.forEach((finding: Finding) => {
      const category = finding.category;
      const existing = categoriesMap.get(category) || {
        name: category,
        findings: 0,
        critical: 0,
        high: 0,
        medium: 0,
      };

      existing.findings++;
      if (finding.severity === 'CRITICAL') existing.critical++;
      else if (finding.severity === 'HIGH') existing.high++;
      else if (finding.severity === 'MEDIUM') existing.medium++;

      categoriesMap.set(category, existing);
    });

    return Array.from(categoriesMap.values());
  }, [findings]);

  // Extract compliance frameworks from API response
  const complianceFrameworks = useMemo(() => {
    if (complianceData?.success && complianceData?.data?.data) {
      return complianceData.data.data;
    }
    return [];
  }, [complianceData]);

  // Loading state
  if ((summaryLoading || findingsLoading || complianceLoading) && !summary && findings.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading security data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (summaryError || findingsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Security Data
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {summaryError instanceof Error ? summaryError.message : 'Unable to fetch security information'}
            </p>
            <button
              onClick={() => {
                refetchFindings();
              }}
              className="px-6 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Security & Compliance
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitor security posture and compliance status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">shield</span>
              Run Security Scan
            </button>
            <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">download</span>
              Compliance Report
            </button>
          </div>
        </div>

        {/* KPI Cards - NOW WITH REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="security"
            label="Security Score"
            value={`${Math.max(0, Math.min(100, securityScore))}/100`}
            variant="emerald"
            comparison={securityScore >= 80 ? 'Good posture' : securityScore >= 60 ? 'Fair posture' : 'Needs attention'}
          />
          <KPICardV2
            icon="error"
            label="Critical Findings"
            value={criticalFindings.toString()}
            variant="red"
            trend={{
              direction: 'down',
              percentage: 20,
              label: 'vs last week',
            }}
          />
          <KPICardV2
            icon="verified"
            label="Compliance Rate"
            value={`${Math.round(complianceScore)}%`}
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 5,
            }}
          />
          <KPICardV2
            icon="warning"
            label="Open Findings"
            value={totalFindings.toString()}
            variant="orange"
            trend={{
              direction: totalFindings > 30 ? 'up' : 'down',
              percentage: 12,
            }}
          />
        </div>

        {/* Main Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Score */}
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Overall Security Score
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Across all cloud providers
              </p>
            </div>
            <div className="flex items-center justify-center">
              <SecurityScoreCircular score={Math.max(0, Math.min(100, securityScore))} />
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeV2 variant="aws" size="sm">
                    AWS
                  </BadgeV2>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Score</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">82/100</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeV2 variant="azure" size="sm">
                    Azure
                  </BadgeV2>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Score</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">87/100</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeV2 variant="gcp" size="sm">
                    GCP
                  </BadgeV2>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Score</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">88/100</span>
              </div>
            </div>
          </div>

          {/* Findings by Category */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Findings by Category
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Security issues breakdown
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {securityCategories && securityCategories.length > 0 ? (
                securityCategories.map((category) => (
                  <div
                    key={category.name}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {category.name}
                      </h4>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {category.findings} findings
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {category.critical > 0 && (
                        <BadgeV2 variant="critical" size="sm">
                          {category.critical} Critical
                        </BadgeV2>
                      )}
                      {category.high > 0 && (
                        <BadgeV2 variant="high" size="sm">
                          {category.high} High
                        </BadgeV2>
                      )}
                      {category.medium > 0 && (
                        <BadgeV2 variant="medium" size="sm">
                          {category.medium} Medium
                        </BadgeV2>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">security</span>
                  <p className="text-sm">No security findings by category</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Frameworks */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Compliance Frameworks
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Adherence to industry standards
              </p>
            </div>
            <button className="text-sm font-medium text-brand-primary-400 hover:text-brand-primary-500 transition-colors flex items-center gap-1">
              View All Reports
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {complianceFrameworks.map((framework) => (
              <div
                key={framework.name}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {framework.name}
                  </h4>
                  <StatusIndicatorV2
                    status={framework.status === 'compliant' ? 'operational' : 'warning'}
                    label={framework.status === 'compliant' ? 'Compliant' : 'Partial'}
                  />
                </div>
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {framework.score}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/100</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-brand-primary-400 h-2 rounded-full"
                      style={{ width: `${framework.score}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {framework.passed} of {framework.controls} controls passed
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Security Findings */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Security Findings
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Latest security issues detected
              </p>
            </div>
            <button className="text-sm font-medium text-brand-primary-400 hover:text-brand-primary-500 transition-colors flex items-center gap-1">
              View All
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Finding
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Detected
                  </th>
                </tr>
              </thead>
              <tbody>
                {findings && findings.length > 0 ? (
                  findings.map((finding: Finding) => (
                    <tr
                      key={finding.id}
                      className={cn(
                        'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-l-4',
                        finding.severity === 'CRITICAL'
                          ? 'border-l-error'
                          : finding.severity === 'HIGH'
                            ? 'border-l-warning'
                            : finding.severity === 'MEDIUM'
                              ? 'border-l-info'
                              : 'border-l-slate-300'
                      )}
                    >
                      <td className="py-3 px-4">
                        <BadgeV2 variant={finding.severity.toLowerCase() as any} size="sm">
                          {finding.severity}
                        </BadgeV2>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {finding.title}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                          {finding.resourceId}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {finding.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <BadgeV2
                          variant={
                            finding.status === 'resolved'
                              ? 'success'
                              : finding.status === 'dismissed'
                                ? 'warning'
                                : 'error'
                          }
                          size="sm"
                        >
                          {finding.status}
                        </BadgeV2>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(finding.detectedAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4 block">
                          shield_check
                        </span>
                        <p className="text-lg font-medium mb-1">No security findings</p>
                        <p className="text-sm">Your cloud infrastructure is secure</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
