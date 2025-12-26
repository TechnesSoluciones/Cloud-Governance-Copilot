'use client';

/**
 * Azure Advisor Recommendations Page
 *
 * Main page for viewing and managing Azure Advisor recommendations.
 *
 * Features:
 * - Summary cards with key metrics
 * - Filterable recommendations list
 * - Sortable table view
 * - Pagination (50 items per page)
 * - Detail modal with tabs
 * - Action buttons (Apply, Suppress, Dismiss)
 * - Savings dashboard
 * - Responsive design
 * - Accessibility support (WCAG 2.1 AA)
 */

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumEmptyState,
  EmptyStateVariants,
  PREMIUM_GRADIENTS,
} from '@/components/shared/premium';
import {
  useRecommendations,
  useRecommendationsSummary,
  usePotentialSavings,
  useSuppressRecommendation,
  useDismissRecommendation,
  useApplyRecommendation,
  extractRecommendationsData,
  extractSummaryData,
  extractSavingsData,
} from '@/hooks/useAzureAdvisor';
import {
  RecommendationFilters,
  AdvisorRecommendationDTO,
  SuppressionDuration,
} from '@/types/azure-advisor';
import {
  RecommendationsSummary,
  RecommendationsFilters,
  RecommendationsList,
  RecommendationDetailModal,
  SavingsDashboard,
} from '@/components/azure-advisor';
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 50;

export default function AzureAdvisorPage() {
  const { addToast } = useToast();
  const router = useRouter();

  // Get cloud accounts
  const { cloudAccounts, isLoading: isLoadingAccounts } = useCloudAccounts();
  const azureAccounts = cloudAccounts.filter((account) => account.provider === 'AZURE');
  const hasAzureAccounts = azureAccounts.length > 0;

  // Tab state
  const [activeTab, setActiveTab] = useState<'recommendations' | 'savings'>('recommendations');

  // Filter state
  const [filters, setFilters] = useState<RecommendationFilters>({
    category: 'all',
    impact: 'all',
    status: 'Active',
    searchQuery: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'lastUpdated' | 'impact' | 'category' | 'savings'>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<AdvisorRecommendationDTO | null>(null);

  // Fetch recommendations with filters
  const {
    data: recommendationsResponse,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations,
  } = useRecommendations({
    category: filters.category,
    impact: filters.impact,
    status: filters.status,
    searchQuery: filters.searchQuery,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    sortBy,
    sortOrder,
  });

  // Fetch summary (active recommendations only)
  const { data: summaryResponse, isLoading: isLoadingSummary } =
    useRecommendationsSummary({
      status: 'Active',
    });

  // Fetch savings dashboard data
  const { data: savingsResponse, isLoading: isLoadingSavings } =
    usePotentialSavings();

  // Mutations
  const { mutate: suppressRecommendation, isPending: isSuppressing } =
    useSuppressRecommendation();
  const { mutate: dismissRecommendation, isPending: isDismissing } =
    useDismissRecommendation();
  const { mutate: applyRecommendation, isPending: isApplying } =
    useApplyRecommendation();

  // Extract data from responses
  const recommendationsData = extractRecommendationsData(recommendationsResponse);
  const summaryData = extractSummaryData(summaryResponse);
  const savingsData = extractSavingsData(savingsResponse);

  const recommendations = recommendationsData?.recommendations || [];
  const totalCount = recommendationsData?.total || 0;

  /**
   * Handle filter changes
   */
  const handleFiltersChange = (newFilters: RecommendationFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Handle sort changes
   */
  const handleSortChange = (newSortBy: 'lastUpdated' | 'impact' | 'category' | 'savings', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  /**
   * Handle page changes
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handle view details
   */
  const handleViewDetails = (recommendation: AdvisorRecommendationDTO) => {
    setSelectedRecommendation(recommendation);
    setDetailModalOpen(true);
  };

  /**
   * Handle suppress
   */
  const handleSuppress = (recommendation: AdvisorRecommendationDTO) => {
    setSelectedRecommendation(recommendation);
    setDetailModalOpen(true);
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = (recommendation: AdvisorRecommendationDTO) => {
    setSelectedRecommendation(recommendation);
    setDetailModalOpen(true);
  };

  /**
   * Handle apply recommendation
   */
  const handleApplyRecommendation = (id: string, notes?: string) => {
    applyRecommendation(
      { id, request: { notes } },
      {
        onSuccess: () => {
          addToast('Recommendation applied successfully', 'success');
          setDetailModalOpen(false);
          setSelectedRecommendation(null);
          refetchRecommendations();
        },
        onError: (error) => {
          addToast(
            error.message || 'Failed to apply recommendation. Please try again.',
            'error'
          );
        },
      }
    );
  };

  /**
   * Handle suppress recommendation
   */
  const handleSuppressRecommendation = (
    id: string,
    duration: SuppressionDuration,
    reason?: string
  ) => {
    suppressRecommendation(
      { id, request: { duration, reason } },
      {
        onSuccess: () => {
          const durationLabel =
            duration === -1 ? 'permanently' : `for ${duration} days`;
          addToast(`Recommendation suppressed ${durationLabel}`, 'success');
          setDetailModalOpen(false);
          setSelectedRecommendation(null);
          refetchRecommendations();
        },
        onError: (error) => {
          addToast(
            error.message || 'Failed to suppress recommendation. Please try again.',
            'error'
          );
        },
      }
    );
  };

  /**
   * Handle dismiss recommendation
   */
  const handleDismissRecommendation = (id: string, reason: string) => {
    dismissRecommendation(
      { id, request: { reason, permanent: true } },
      {
        onSuccess: () => {
          addToast('Recommendation dismissed', 'success');
          setDetailModalOpen(false);
          setSelectedRecommendation(null);
          refetchRecommendations();
        },
        onError: (error) => {
          addToast(
            error.message || 'Failed to dismiss recommendation. Please try again.',
            'error'
          );
        },
      }
    );
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refetchRecommendations();
    addToast('Refreshing recommendations...', 'info');
  };

  // Handle empty states early
  const handleNavigateToCloudAccounts = () => {
    router.push('/cloud-accounts');
  };

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Azure Advisor"
          subtitle="Personalized best practices recommendations to optimize your Azure resources"
          actions={
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              disabled={isLoadingRecommendations || !hasAzureAccounts}
              className="shadow-lg"
              aria-label="Refresh recommendations"
            >
              <RefreshCw
                className={`h-5 w-5 mr-2 ${
                  isLoadingRecommendations ? 'animate-spin' : ''
                }`}
              />
              {isLoadingRecommendations ? 'Refreshing...' : 'Refresh'}
            </Button>
          }
        />

        {/* Empty State - No Azure Accounts */}
        {!isLoadingAccounts && !hasAzureAccounts ? (
          <PremiumEmptyState
            {...EmptyStateVariants.noCloudAccounts(handleNavigateToCloudAccounts)}
            title="No Azure Accounts Connected"
            description="Connect your Azure account to start receiving personalized recommendations to optimize your cloud resources."
          />
        ) : (
          <>
            {/* Summary Cards */}
            {activeTab === 'recommendations' && (
              <RecommendationsSummary data={summaryData} isLoading={isLoadingSummary} />
            )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="savings">Savings Dashboard</TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-6 space-y-6">
            {/* Filters */}
            <RecommendationsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              showSearch
            />

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {recommendations.length}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{totalCount}</span>{' '}
                recommendations
              </p>
            </div>

            {/* Error State */}
            {recommendationsError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle
                  className="h-6 w-6 text-red-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">
                    Error Loading Recommendations
                  </h3>
                  <p className="mt-1 text-sm text-red-800">
                    There was an error loading your recommendations. Please try again.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State - No Recommendations */}
            {!isLoadingRecommendations && !recommendationsError && recommendations.length === 0 ? (
              <PremiumEmptyState
                {...EmptyStateVariants.noRecommendations()}
              />
            ) : (
              /* Recommendations List */
              <RecommendationsList
                recommendations={recommendations}
                isLoading={isLoadingRecommendations}
                onViewDetails={handleViewDetails}
                onSuppress={handleSuppress}
                onDismiss={handleDismiss}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}
          </TabsContent>

          {/* Savings Dashboard Tab */}
          <TabsContent value="savings" className="mt-6">
            <SavingsDashboard data={savingsData} isLoading={isLoadingSavings} />
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {hasAzureAccounts && (
        <RecommendationDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          recommendation={selectedRecommendation}
          onApply={handleApplyRecommendation}
          onSuppress={handleSuppressRecommendation}
          onDismiss={handleDismissRecommendation}
          isApplying={isApplying}
          isSuppressing={isSuppressing}
          isDismissing={isDismissing}
        />
      )}
    </div>
  );
}
