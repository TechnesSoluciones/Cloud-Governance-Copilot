/**
 * Recommendations V2 Page
 * CloudNexus Design - Complete Recommendations Implementation
 */

'use client';

import { useState, useMemo } from 'react';
import { FilterToolbar, FilterGroup } from '@/components/ui/FilterToolbar';
import { RecommendationCard, Recommendation } from '@/components/dashboard/RecommendationCard';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { useRecommendations } from '@/hooks/useRecommendations';
import { cn } from '@/lib/utils';

const filterGroups: FilterGroup[] = [
  {
    id: 'provider',
    label: 'Provider',
    icon: 'cloud',
    multiSelect: true,
    options: [
      { id: 'aws', label: 'AWS', value: 'AWS', count: 12 },
      { id: 'azure', label: 'Azure', value: 'Azure', count: 8 },
      { id: 'gcp', label: 'GCP', value: 'GCP', count: 5 },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    icon: 'category',
    multiSelect: true,
    options: [
      { id: 'security', label: 'Security', value: 'security', count: 9 },
      { id: 'cost', label: 'Cost Optimization', value: 'cost', count: 11 },
      { id: 'performance', label: 'Performance', value: 'performance', count: 3 },
      { id: 'reliability', label: 'Reliability', value: 'reliability', count: 2 },
    ],
  },
  {
    id: 'severity',
    label: 'Severity',
    icon: 'priority_high',
    multiSelect: true,
    options: [
      { id: 'critical', label: 'Critical', value: 'critical', count: 3 },
      { id: 'high', label: 'High', value: 'high', count: 8 },
      { id: 'medium', label: 'Medium', value: 'medium', count: 10 },
      { id: 'low', label: 'Low', value: 'low', count: 4 },
    ],
  },
  {
    id: 'effort',
    label: 'Effort',
    icon: 'work',
    multiSelect: false,
    options: [
      { id: 'low', label: 'Low Effort', value: 'low', count: 12 },
      { id: 'medium', label: 'Medium Effort', value: 'medium', count: 9 },
      { id: 'high', label: 'High Effort', value: 'high', count: 4 },
    ],
  },
];

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    severity: 'critical',
    category: 'security',
    title: 'Unencrypted S3 buckets detected',
    description:
      'Multiple S3 buckets are storing sensitive data without encryption at rest. This poses a significant security risk and violates compliance requirements.',
    resource: 's3://prod-data-bucket',
    provider: 'AWS',
    region: 'us-east-1',
    impact: 'High - Data breach risk',
    effort: 'low',
    affectedResources: 3,
    tags: ['compliance', 'encryption', 'GDPR'],
    steps: [
      'Navigate to S3 console',
      'Select the bucket',
      'Enable default encryption with AES-256 or KMS',
      'Update bucket policy to enforce encryption',
    ],
  },
  {
    id: '2',
    severity: 'high',
    category: 'cost',
    title: 'Idle EC2 instances running',
    description:
      'Several EC2 instances have been running with less than 5% CPU utilization for the past 30 days, indicating they are not being actively used.',
    resource: 'i-0abc123def456',
    provider: 'AWS',
    region: 'us-west-2',
    savings: '$450/mo',
    impact: 'Medium - Cost reduction',
    effort: 'low',
    affectedResources: 5,
    tags: ['compute', 'optimization', 'savings'],
    steps: [
      'Review instance usage patterns',
      'Identify non-critical instances',
      'Stop or terminate unused instances',
      'Consider auto-scaling groups',
    ],
  },
  {
    id: '3',
    severity: 'medium',
    category: 'cost',
    title: 'Unused Azure storage volumes',
    description:
      'Unattached storage volumes have been identified that are not connected to any running virtual machines, generating unnecessary costs.',
    resource: 'vol-prod-backup-01',
    provider: 'Azure',
    region: 'westeurope',
    savings: '$120/mo',
    impact: 'Low - Cost reduction',
    effort: 'low',
    affectedResources: 8,
    tags: ['storage', 'cleanup', 'savings'],
    steps: [
      'List all unattached disks',
      'Verify no backup dependencies',
      'Create snapshots if needed',
      'Delete unattached disks',
    ],
  },
  {
    id: '4',
    severity: 'high',
    category: 'security',
    title: 'Public RDS snapshots found',
    description:
      'Database snapshots are publicly accessible, potentially exposing sensitive application data to unauthorized access.',
    resource: 'rds-snapshot-2024',
    provider: 'AWS',
    region: 'eu-central-1',
    impact: 'High - Data exposure risk',
    effort: 'low',
    affectedResources: 2,
    tags: ['database', 'access-control', 'security'],
    steps: [
      'Identify public snapshots',
      'Review snapshot permissions',
      'Set snapshots to private',
      'Implement snapshot encryption',
    ],
  },
  {
    id: '5',
    severity: 'medium',
    category: 'cost',
    title: 'Oversized GCP VM instances',
    description:
      'Virtual machine instances are provisioned with more resources than needed based on actual usage patterns over the last 90 days.',
    resource: 'instance-prod-web-01',
    provider: 'GCP',
    region: 'us-central1',
    savings: '$280/mo',
    impact: 'Medium - Cost reduction',
    effort: 'medium',
    affectedResources: 4,
    tags: ['compute', 'rightsizing', 'optimization'],
    steps: [
      'Analyze instance metrics',
      'Identify rightsizing opportunities',
      'Create instance snapshot',
      'Resize to appropriate machine type',
    ],
  },
  {
    id: '6',
    severity: 'critical',
    category: 'security',
    title: 'IAM users with full admin access',
    description:
      'Multiple IAM users have been granted full administrative privileges without following the principle of least privilege.',
    resource: 'iam://user/john.doe',
    provider: 'AWS',
    region: 'global',
    impact: 'Critical - Security breach risk',
    effort: 'high',
    affectedResources: 7,
    tags: ['iam', 'access-management', 'compliance'],
    steps: [
      'Audit all IAM users and permissions',
      'Create role-based policies',
      'Remove unnecessary admin access',
      'Implement MFA for privileged accounts',
      'Enable CloudTrail for audit logging',
    ],
  },
  {
    id: '7',
    severity: 'low',
    category: 'performance',
    title: 'Enable CloudFront caching',
    description:
      'Static content is being served directly from S3 without CDN caching, resulting in slower load times for global users.',
    resource: 's3://static-assets-bucket',
    provider: 'AWS',
    region: 'us-east-1',
    impact: 'Low - Performance improvement',
    effort: 'medium',
    affectedResources: 1,
    tags: ['cdn', 'performance', 'latency'],
    steps: [
      'Create CloudFront distribution',
      'Configure origin settings',
      'Set cache behaviors',
      'Update DNS records',
    ],
  },
  {
    id: '8',
    severity: 'high',
    category: 'reliability',
    title: 'Missing database backups',
    description:
      'Critical database instances do not have automated backup policies configured, risking data loss in case of failure.',
    resource: 'db-prod-main',
    provider: 'Azure',
    region: 'eastus',
    impact: 'High - Data loss risk',
    effort: 'low',
    affectedResources: 3,
    tags: ['backup', 'disaster-recovery', 'reliability'],
    steps: [
      'Enable automated backups',
      'Configure retention period',
      'Set backup window',
      'Test restore procedure',
    ],
  },
];

export default function RecommendationsV2Page() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(
    null
  );
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Fetch recommendations from backend
  const { data: recommendationsData, isLoading, error, refetch } = useRecommendations({
    page: 1,
    limit: 100,
  });

  // Extract recommendations from API response
  const recommendations = useMemo(() => {
    if (!recommendationsData?.success || !recommendationsData.data) return [];
    return recommendationsData.data.data || [];
  }, [recommendationsData]);

  // Apply filters to recommendations (must be before early returns)
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Apply provider filter
    if (activeFilters.provider && activeFilters.provider.length > 0) {
      filtered = filtered.filter((rec) => activeFilters.provider.includes(rec.provider));
    }

    // Apply category filter
    if (activeFilters.category && activeFilters.category.length > 0) {
      filtered = filtered.filter((rec) => activeFilters.category.includes(rec.category));
    }

    // Apply severity filter
    if (activeFilters.severity && activeFilters.severity.length > 0) {
      filtered = filtered.filter((rec) => activeFilters.severity.includes(rec.severity));
    }

    // Apply effort filter
    if (activeFilters.effort && activeFilters.effort.length > 0) {
      filtered = filtered.filter((rec) => activeFilters.effort.includes(rec.effort));
    }

    return filtered;
  }, [recommendations, activeFilters]);

  // Loading state
  if (isLoading && recommendations.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Recommendations
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {error instanceof Error ? error.message : 'Unable to fetch recommendations data'}
            </p>
            <button
              onClick={() => refetch()}
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

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    setActiveFilters(prev => ({ ...prev, [filterId]: selectedValues }));
  };

  const totalSavings = recommendations
    .filter((rec) => rec.savings)
    .reduce((sum, rec) => {
      const amount = parseInt(rec.savings!.replace(/[^0-9]/g, ''));
      return sum + amount;
    }, 0);

  return (
    <div className="h-full flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Recommendations
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Optimize your cloud infrastructure with AI-powered recommendations
                </p>
              </div>

              <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">download</span>
                Export Report
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary-400/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-brand-primary-400">
                      lightbulb
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {mockRecommendations.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total Recommendations
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-success">
                      attach_money
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      ${totalSavings.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Potential Savings/mo
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-error">error</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {mockRecommendations.filter((r) => r.severity === 'critical').length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Critical Issues
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-info">dns</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {mockRecommendations.reduce((sum, r) => sum + r.affectedResources, 0)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Affected Resources
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="mb-6">
            <FilterToolbar filters={filterGroups} onFilterChange={handleFilterChange} />
          </div>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                selected={selectedRecommendation?.id === recommendation.id}
                onClick={() => setSelectedRecommendation(recommendation)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredRecommendations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
                search_off
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No recommendations found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}
        </div>

        {/* Side Panel */}
        {selectedRecommendation && (
          <div className="w-96 bg-white dark:bg-card-dark border-l border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Close Button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recommendation Details
                </h2>
                <button
                  onClick={() => setSelectedRecommendation(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>

              {/* Severity Badge */}
              <div className="flex items-center gap-2 mb-4">
                <BadgeV2 variant={selectedRecommendation.severity}>
                  {selectedRecommendation.severity}
                </BadgeV2>
                <BadgeV2
                  variant={
                    selectedRecommendation.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'
                  }
                >
                  {selectedRecommendation.provider}
                </BadgeV2>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {selectedRecommendation.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {selectedRecommendation.description}
              </p>

              {/* Resource Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Resource
                </h4>
                <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded text-slate-700 dark:text-slate-300 block overflow-x-auto custom-scrollbar">
                  {selectedRecommendation.resource}
                </code>
                {selectedRecommendation.region && (
                  <div className="mt-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Region: </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedRecommendation.region}
                    </span>
                  </div>
                )}
              </div>

              {/* Impact & Savings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Impact
                  </h4>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {selectedRecommendation.impact}
                  </p>
                </div>
                {selectedRecommendation.savings && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Monthly Savings
                    </h4>
                    <p className="text-xl font-bold text-success">
                      {selectedRecommendation.savings}
                    </p>
                  </div>
                )}
              </div>

              {/* Affected Resources */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Affected Resources
                </h4>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedRecommendation.affectedResources}
                </p>
              </div>

              {/* Remediation Steps */}
              {selectedRecommendation.steps && selectedRecommendation.steps.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Remediation Steps
                  </h4>
                  <ol className="space-y-3">
                    {selectedRecommendation.steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary-400 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tags */}
              {selectedRecommendation.tags && selectedRecommendation.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecommendation.tags.map((tag) => (
                      <BadgeV2 key={tag} variant="default" size="sm">
                        {tag}
                      </BadgeV2>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">play_arrow</span>
                  Apply Recommendation
                </button>
                <button className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">schedule</span>
                  Schedule for Later
                </button>
                <button className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">visibility_off</span>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
