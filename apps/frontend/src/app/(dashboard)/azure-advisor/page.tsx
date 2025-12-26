/**
 * Azure Advisor V2 Page
 * CloudNexus Design - Azure-specific recommendations
 */

'use client';

import { useState } from 'react';
import { DashboardLayoutV2 } from '@/components/layout/DashboardLayoutV2';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { FilterToolbar, FilterGroup } from '@/components/ui/FilterToolbar';
import { RecommendationCard, Recommendation } from '@/components/dashboard/RecommendationCard';

const filterGroups: FilterGroup[] = [
  {
    id: 'category',
    label: 'Category',
    icon: 'category',
    multiSelect: true,
    options: [
      { id: 'cost', label: 'Cost', value: 'cost', count: 8 },
      { id: 'security', label: 'Security', value: 'security', count: 5 },
      { id: 'reliability', label: 'Reliability', value: 'reliability', count: 3 },
      { id: 'performance', label: 'Performance', value: 'performance', count: 4 },
      { id: 'operational', label: 'Operational Excellence', value: 'operational', count: 2 },
    ],
  },
  {
    id: 'impact',
    label: 'Impact',
    icon: 'priority_high',
    multiSelect: true,
    options: [
      { id: 'high', label: 'High', value: 'high', count: 7 },
      { id: 'medium', label: 'Medium', value: 'medium', count: 10 },
      { id: 'low', label: 'Low', value: 'low', count: 5 },
    ],
  },
];

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    severity: 'high',
    category: 'cost',
    title: 'Right-size underutilized virtual machines',
    description:
      'Your virtual machine has been running with low CPU utilization. Consider resizing to a smaller VM size to reduce costs.',
    resource: 'vm-prod-web-01',
    provider: 'Azure',
    region: 'eastus',
    savings: '$320/mo',
    impact: 'High - 40% cost reduction',
    effort: 'low',
    affectedResources: 3,
    tags: ['vm', 'rightsizing', 'cost-optimization'],
    steps: [
      'Review VM metrics over the last 30 days',
      'Identify target VM size based on workload',
      'Create snapshot of current VM',
      'Resize VM to recommended size',
      'Monitor performance after resize',
    ],
  },
  {
    id: '2',
    severity: 'critical',
    category: 'security',
    title: 'Enable Azure Defender for Storage',
    description:
      'Azure Defender for Storage provides threat protection for your storage accounts by detecting unusual and potentially harmful attempts to access or exploit storage.',
    resource: 'storage-prod-data',
    provider: 'Azure',
    region: 'westeurope',
    impact: 'Critical - Prevent data breaches',
    effort: 'low',
    affectedResources: 5,
    tags: ['security', 'defender', 'storage'],
    steps: [
      'Navigate to Azure Security Center',
      'Select Storage Accounts',
      'Enable Azure Defender',
      'Configure alert notifications',
      'Review security recommendations',
    ],
  },
  {
    id: '3',
    severity: 'medium',
    category: 'reliability',
    title: 'Enable backup for critical VMs',
    description:
      'Virtual machines tagged as critical do not have backup policies configured. Enable Azure Backup to protect against data loss.',
    resource: 'vm-prod-database',
    provider: 'Azure',
    region: 'northeurope',
    impact: 'Medium - Data protection',
    effort: 'medium',
    affectedResources: 4,
    tags: ['backup', 'disaster-recovery', 'reliability'],
    steps: [
      'Create Recovery Services vault',
      'Configure backup policy',
      'Enable backup for VMs',
      'Test restore procedure',
      'Set up backup alerts',
    ],
  },
  {
    id: '4',
    severity: 'high',
    category: 'performance',
    title: 'Upgrade to Premium SSD for database workloads',
    description:
      'Your database VMs are using Standard HDD disks. Upgrade to Premium SSD for better IOPS and lower latency.',
    resource: 'disk-db-prod-data',
    provider: 'Azure',
    region: 'eastus',
    impact: 'High - 10x performance improvement',
    effort: 'medium',
    affectedResources: 2,
    tags: ['performance', 'storage', 'database'],
    steps: [
      'Backup current disk',
      'Create Premium SSD disk',
      'Migrate data to new disk',
      'Swap disks on VM',
      'Benchmark performance',
    ],
  },
];

export default function AzureAdvisorV2Page() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(
    null
  );
  const [filteredRecommendations, setFilteredRecommendations] =
    useState<Recommendation[]>(mockRecommendations);

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    // Simple filter implementation
    let filtered = mockRecommendations;

    if (selectedValues.length > 0) {
      if (filterId === 'category') {
        filtered = filtered.filter((rec) => selectedValues.includes(rec.category));
      } else if (filterId === 'impact') {
        filtered = filtered.filter((rec) =>
          selectedValues.some((val) => rec.impact.toLowerCase().includes(val))
        );
      }
    }

    setFilteredRecommendations(filtered);
  };

  const totalSavings = mockRecommendations
    .filter((rec) => rec.savings)
    .reduce((sum, rec) => {
      const amount = parseInt(rec.savings!.replace(/[^0-9]/g, ''));
      return sum + amount;
    }, 0);

  return (
    <DashboardLayoutV2>
      <div className="h-full flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Azure Advisor
                  </h1>
                  <BadgeV2 variant="azure" icon="cloud">
                    Azure Only
                  </BadgeV2>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Personalized best practices and recommendations for your Azure resources
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Refresh
                </button>
                <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export Report
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <KPICardV2
                icon="lightbulb"
                label="Total Recommendations"
                value={mockRecommendations.length.toString()}
                variant="blue"
              />
              <KPICardV2
                icon="attach_money"
                label="Potential Savings"
                value={`$${totalSavings.toLocaleString()}/mo`}
                variant="emerald"
              />
              <KPICardV2
                icon="error"
                label="High Impact"
                value={mockRecommendations.filter((r) => r.severity === 'high').length.toString()}
                variant="orange"
              />
              <KPICardV2
                icon="verified"
                label="Score Improvement"
                value="+12%"
                variant="indigo"
                trend={{
                  direction: 'up',
                  percentage: 12,
                  label: 'vs last scan',
                }}
              />
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
                Try adjusting your filters or refresh to get latest recommendations
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

              {/* Content - Same as RecommendationsTable detail panel */}
              <div className="flex items-center gap-2 mb-4">
                <BadgeV2 variant={selectedRecommendation.severity}>
                  {selectedRecommendation.severity}
                </BadgeV2>
                <BadgeV2 variant="azure">Azure</BadgeV2>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {selectedRecommendation.title}
              </h3>

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

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">play_arrow</span>
                  Apply Recommendation
                </button>
                <button className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">schedule</span>
                  Suppress
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
    </DashboardLayoutV2>
  );
}
