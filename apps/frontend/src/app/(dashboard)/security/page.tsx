/**
 * Security V2 Page
 * CloudNexus Design - Complete Security Dashboard Implementation
 */

'use client';

import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { SecurityScoreCircular } from '@/components/charts/SecurityScoreCircular';
import { cn } from '@/lib/utils';

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  resource: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  detectedDate: string;
}

const securityFindings: SecurityFinding[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Unencrypted S3 bucket with public access',
    resource: 's3://prod-data-bucket',
    provider: 'AWS',
    category: 'Data Protection',
    status: 'open',
    detectedDate: '2024-01-15',
  },
  {
    id: '2',
    severity: 'critical',
    title: 'IAM user with full admin privileges',
    resource: 'iam://user/john.doe',
    provider: 'AWS',
    category: 'Access Management',
    status: 'open',
    detectedDate: '2024-01-14',
  },
  {
    id: '3',
    severity: 'high',
    title: 'RDS instance publicly accessible',
    resource: 'rds://db-prod-main',
    provider: 'AWS',
    category: 'Network Security',
    status: 'in_progress',
    detectedDate: '2024-01-13',
  },
  {
    id: '4',
    severity: 'high',
    title: 'Storage account without firewall rules',
    resource: 'storage://prodstorage01',
    provider: 'Azure',
    category: 'Network Security',
    status: 'open',
    detectedDate: '2024-01-12',
  },
  {
    id: '5',
    severity: 'medium',
    title: 'MFA not enabled for privileged accounts',
    resource: 'iam://group/admins',
    provider: 'AWS',
    category: 'Access Management',
    status: 'in_progress',
    detectedDate: '2024-01-11',
  },
  {
    id: '6',
    severity: 'medium',
    title: 'Outdated SSL/TLS certificate',
    resource: 'lb://prod-web-lb',
    provider: 'GCP',
    category: 'Encryption',
    status: 'resolved',
    detectedDate: '2024-01-10',
  },
];

const complianceFrameworks = [
  { name: 'SOC 2', score: 92, status: 'compliant' as const, controls: 78, passed: 72 },
  { name: 'ISO 27001', score: 88, status: 'compliant' as const, controls: 114, passed: 100 },
  { name: 'GDPR', score: 85, status: 'partial' as const, controls: 45, passed: 38 },
  { name: 'HIPAA', score: 78, status: 'partial' as const, controls: 52, passed: 41 },
  { name: 'PCI DSS', score: 95, status: 'compliant' as const, controls: 35, passed: 33 },
];

const securityCategories = [
  { name: 'Data Protection', findings: 8, critical: 2, high: 3, medium: 3 },
  { name: 'Access Management', findings: 12, critical: 3, high: 4, medium: 5 },
  { name: 'Network Security', findings: 6, critical: 0, high: 2, medium: 4 },
  { name: 'Encryption', findings: 4, critical: 0, high: 1, medium: 3 },
  { name: 'Logging & Monitoring', findings: 5, critical: 1, high: 2, medium: 2 },
];

export default function SecurityV2Page() {
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="security"
            label="Security Score"
            value="85/100"
            variant="emerald"
            comparison="Good posture"
          />
          <KPICardV2
            icon="error"
            label="Critical Findings"
            value="5"
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
            value="88%"
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 5,
            }}
          />
          <KPICardV2
            icon="warning"
            label="Open Findings"
            value="35"
            variant="orange"
            trend={{
              direction: 'up',
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
              <SecurityScoreCircular score={85} />
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
              {securityCategories.map((category) => (
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
              ))}
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
                {securityFindings.map((finding) => (
                  <tr
                    key={finding.id}
                    className={cn(
                      'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-l-4',
                      finding.severity === 'critical'
                        ? 'border-l-error'
                        : finding.severity === 'high'
                          ? 'border-l-warning'
                          : finding.severity === 'medium'
                            ? 'border-l-info'
                            : 'border-l-slate-300'
                    )}
                  >
                    <td className="py-3 px-4">
                      <BadgeV2 variant={finding.severity} size="sm">
                        {finding.severity}
                      </BadgeV2>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <BadgeV2
                          variant={finding.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                          size="sm"
                        >
                          {finding.provider}
                        </BadgeV2>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {finding.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                        {finding.resource}
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
                            : finding.status === 'in_progress'
                              ? 'warning'
                              : 'error'
                        }
                        size="sm"
                      >
                        {finding.status.replace('_', ' ')}
                      </BadgeV2>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {finding.detectedDate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
