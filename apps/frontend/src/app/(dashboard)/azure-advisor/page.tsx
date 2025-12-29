/**
 * Azure Advisor V2 Page
 * CloudNexus Design - Azure-specific recommendations
 */

'use client';

import { useState, useEffect } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { FilterToolbar, FilterGroup } from '@/components/ui/FilterToolbar';
import { RecommendationCard, Recommendation } from '@/components/dashboard/RecommendationCard';
import {
  useRecommendations,
  useRecommendationsSummary,
  useApplyRecommendation,
  useDismissRecommendation,
  extractRecommendationsData,
  extractSummaryData
} from '@/hooks/useRecommendations';
import { Recommendation as ApiRecommendation } from '@/lib/api/recommendations';

// Helper function to transform API recommendation to component format
function transformRecommendation(apiRec: ApiRecommendation): Recommendation {
  // Map API type to component category
  const categoryMap: Record<string, 'security' | 'cost' | 'performance' | 'reliability'> = {
    'idle_resource': 'cost',
    'rightsize': 'cost',
    'reserved_instance': 'cost',
    'unused_resource': 'cost',
    'delete_snapshot': 'cost',
  };

  // Map API priority to component severity
  const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
  };

  return {
    id: apiRec.id,
    severity: severityMap[apiRec.priority] || 'medium',
    category: categoryMap[apiRec.type] || 'cost',
    title: apiRec.title,
    description: apiRec.description,
    resource: apiRec.resourceId,
    provider: 'Azure',
    region: apiRec.metadata?.region || 'N/A',
    savings: `$${apiRec.estimatedSavings}/${apiRec.savingsPeriod === 'monthly' ? 'mo' : 'yr'}`,
    impact: `${apiRec.priority.charAt(0).toUpperCase() + apiRec.priority.slice(1)} - Estimated ${apiRec.estimatedSavings} ${apiRec.savingsPeriod} savings`,
    effort: (apiRec.metadata?.effort as 'low' | 'medium' | 'high') || 'medium',
    affectedResources: 1,
    steps: apiRec.metadata?.steps || [],
    tags: [apiRec.type, apiRec.service],
  };
}

const filterGroups: FilterGroup[] = [
  {
    id: 'category',
    label: 'Category',
    icon: 'category',
    multiSelect: true,
    options: [
      { id: 'cost', label: 'Cost', value: 'cost', count: 0 },
      { id: 'security', label: 'Security', value: 'security', count: 0 },
      { id: 'reliability', label: 'Reliability', value: 'reliability', count: 0 },
      { id: 'performance', label: 'Performance', value: 'performance', count: 0 },
      { id: 'operational', label: 'Operational Excellence', value: 'operational', count: 0 },
    ],
  },
  {
    id: 'impact',
    label: 'Impact',
    icon: 'priority_high',
    multiSelect: true,
    options: [
      { id: 'high', label: 'High', value: 'high', count: 0 },
      { id: 'medium', label: 'Medium', value: 'medium', count: 0 },
      { id: 'low', label: 'Low', value: 'low', count: 0 },
    ],
  },
];

export default function AzureAdvisorV2Page() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recommendations from API
  const { data: recommendationsData, refetch: refetchRecommendations, isLoading: isLoadingRecs } = useRecommendations({
    status: 'open',
    provider: 'AZURE',
  });

  // Fetch summary data
  const { data: summaryData, isLoading: isLoadingSummary } = useRecommendationsSummary({
    status: 'open',
    provider: 'AZURE',
  });

  // Mutations
  const { mutate: applyRecommendation, isPending: isApplying } = useApplyRecommendation();
  const { mutate: dismissRecommendation, isPending: isDismissing } = useDismissRecommendation();

  // Transform and set recommendations when data changes
  useEffect(() => {
    const data = extractRecommendationsData(recommendationsData);
    if (data?.recommendations) {
      const transformed = data.recommendations.map(transformRecommendation);
      setRecommendations(transformed);
      setFilteredRecommendations(transformed);
    }
    setIsLoading(isLoadingRecs || isLoadingSummary);
  }, [recommendationsData, isLoadingRecs, isLoadingSummary]);

  const handleFilterChange = (filterId: string, selectedValues: string[]) => {
    let filtered = recommendations;

    if (selectedValues.length > 0) {
      if (filterId === 'category') {
        filtered = filtered.filter((rec) => selectedValues.includes(rec.category));
      } else if (filterId === 'impact') {
        filtered = filtered.filter((rec) =>
          selectedValues.some((val) => rec.severity === val)
        );
      }
    }

    setFilteredRecommendations(filtered);
  };

  const handleRefresh = async () => {
    await refetchRecommendations();
  };

  const handleApply = (recommendationId: string) => {
    applyRecommendation(
      { id: recommendationId },
      {
        onSuccess: () => {
          alert('Recommendation applied successfully');
          setSelectedRecommendation(null);
          refetchRecommendations();
        },
        onError: (error) => {
          alert(`Failed to apply recommendation: ${error.message}`);
        },
      }
    );
  };

  const handleDismiss = (recommendationId: string) => {
    const reason = prompt('Please provide a reason for dismissing this recommendation:');
    if (!reason) return;

    dismissRecommendation(
      { id: recommendationId, params: { reason } },
      {
        onSuccess: () => {
          alert('Recommendation dismissed');
          setSelectedRecommendation(null);
          refetchRecommendations();
        },
        onError: (error) => {
          alert(`Failed to dismiss recommendation: ${error.message}`);
        },
      }
    );
  };

  const handleExport = () => {
    // Export recommendations as JSON
    const dataStr = JSON.stringify(recommendations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azure-advisor-recommendations-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = extractSummaryData(summaryData);
  const totalSavings = summary?.totalEstimatedSavings || 0;

  return (
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
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={recommendations.length === 0}
                  className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
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
                value={isLoading ? '...' : (summary?.totalRecommendations || 0).toString()}
                variant="blue"
              />
              <KPICardV2
                icon="attach_money"
                label="Potential Savings"
                value={isLoading ? '...' : `$${totalSavings.toLocaleString()}/mo`}
                variant="emerald"
              />
              <KPICardV2
                icon="error"
                label="High Priority"
                value={isLoading ? '...' : (summary?.byPriority?.high || 0).toString()}
                variant="orange"
              />
              <KPICardV2
                icon="verified"
                label="Medium Priority"
                value={isLoading ? '...' : (summary?.byPriority?.medium || 0).toString()}
                variant="indigo"
              />
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="mb-6">
            <FilterToolbar filters={filterGroups} onFilterChange={handleFilterChange} />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-400"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading recommendations...</p>
              </div>
            </div>
          )}

          {/* Recommendations Grid */}
          {!isLoading && (
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
          )}

          {/* Empty State */}
          {!isLoading && filteredRecommendations.length === 0 && (
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
                <button
                  onClick={() => handleApply(selectedRecommendation.id)}
                  disabled={isApplying}
                  className="w-full px-4 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  {isApplying ? 'Applying...' : 'Apply Recommendation'}
                </button>
                <button
                  onClick={() => handleDismiss(selectedRecommendation.id)}
                  disabled={isDismissing}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">visibility_off</span>
                  {isDismissing ? 'Dismissing...' : 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
