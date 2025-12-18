'use client';

/**
 * Recommendations Page
 *
 * Main page for viewing and managing cost optimization recommendations.
 * Features:
 * - KPI cards showing summary metrics
 * - Filters for status, type, provider, and priority
 * - Grid of recommendation cards
 * - Apply, dismiss, and view details actions
 * - Pagination for large result sets
 * - Empty states and error handling
 * - Loading states with skeletons
 */

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GridCardsSkeleton, StatCardGridSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  CheckCircle,
} from 'lucide-react';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PremiumEmptyState,
  EmptyStateVariants,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS,
} from '@/components/shared/premium';
import {
  useRecommendations,
  useRecommendationsSummary,
  useGenerateRecommendations,
  useApplyRecommendation,
  useDismissRecommendation,
  extractRecommendationsData,
  extractSummaryData,
} from '@/hooks/useRecommendations';
import {
  Recommendation,
  RecommendationStatus,
  RecommendationType,
  RecommendationPriority,
  formatSavings,
} from '@/lib/api/recommendations';
import { Provider } from '@/lib/api/finops';
import { RecommendationsFilters } from '@/components/recommendations/RecommendationsFilters';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { ApplyModal } from '@/components/recommendations/ApplyModal';
import { DismissModal } from '@/components/recommendations/DismissModal';
import { RecommendationDetailModal } from '@/components/recommendations/RecommendationDetailModal';

const ITEMS_PER_PAGE = 20;

export default function RecommendationsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Filter state
  const [status, setStatus] = useState<RecommendationStatus | undefined>('open');
  const [type, setType] = useState<RecommendationType | undefined>(undefined);
  const [provider, setProvider] = useState<Provider | undefined>(undefined);
  const [priority, setPriority] = useState<RecommendationPriority | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Recommendation | null>(null);

  // Fetch recommendations with filters
  const {
    data: recommendationsResponse,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations,
  } = useRecommendations({
    status,
    type,
    provider,
    priority,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Fetch summary for KPIs (only open recommendations)
  const { data: summaryResponse, isLoading: isLoadingSummary } =
    useRecommendationsSummary({
      status: 'open',
    });

  // Mutations
  const { mutate: generateRecommendations, isPending: isGenerating } =
    useGenerateRecommendations();
  const { mutate: applyRecommendation, isPending: isApplying } =
    useApplyRecommendation();
  const { mutate: dismissRecommendation, isPending: isDismissing } =
    useDismissRecommendation();

  // Extract data
  const recommendationsData = extractRecommendationsData(recommendationsResponse);
  const summaryData = extractSummaryData(summaryResponse);
  const recommendations = recommendationsData?.recommendations || [];
  const totalCount = recommendationsData?.total || 0;
  const totalPages = recommendationsData?.totalPages || 1;

  // Handlers
  const handleGenerateRecommendations = () => {
    generateRecommendations(
      {},
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            addToast(
              `Generated ${data.data.recommendationsGenerated} new recommendations`,
              'success'
            );
            refetchRecommendations();
          }
        },
        onError: (error) => {
          addToast('Failed to generate recommendations. Please try again.', 'error');
        },
      }
    );
  };

  const handleApplyClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setApplyModalOpen(true);
  };

  const handleDismissClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setDismissModalOpen(true);
  };

  const handleViewDetailsClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setDetailModalOpen(true);
  };

  const handleApplyConfirm = (notes?: string) => {
    if (!selectedRecommendation) return;

    applyRecommendation(
      {
        id: selectedRecommendation.id,
        params: notes ? { notes } : {},
      },
      {
        onSuccess: () => {
          addToast('Recommendation applied successfully', 'success');
          setApplyModalOpen(false);
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

  const handleDismissConfirm = (reason: string) => {
    if (!selectedRecommendation) return;

    dismissRecommendation(
      {
        id: selectedRecommendation.id,
        params: { reason },
      },
      {
        onSuccess: () => {
          addToast('Recommendation dismissed', 'success');
          setDismissModalOpen(false);
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

  const handleClearFilters = () => {
    setStatus('open');
    setType(undefined);
    setProvider(undefined);
    setPriority(undefined);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [status, type, provider, priority]);

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Recommendations"
          subtitle="AI-powered cost optimization recommendations for your cloud infrastructure"
          actions={
            <Button
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              size="lg"
              className="bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" aria-hidden="true" />
                  Generate Recommendations
                </>
              )}
            </Button>
          }
        />

        {/* Premium Stats Bar */}
        {isLoadingSummary ? (
          <StatCardGridSkeleton count={4} />
        ) : summaryData ? (
          <PremiumStatsBar
            stats={[
              {
                label: 'Total Open',
                value: summaryData.totalRecommendations || 0,
                icon: <TrendingUp className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: 'Open recommendations',
              },
              {
                label: 'Potential Savings',
                value: summaryData.totalEstimatedSavings
                  ? formatSavings(summaryData.totalEstimatedSavings)
                  : '$0',
                icon: <DollarSign className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.warning,
                iconColor: PREMIUM_ICON_COLORS.warning,
                subtitle: 'Monthly savings opportunity',
              },
              {
                label: 'High Priority',
                value: summaryData.byPriority.high || 0,
                icon: <AlertCircle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.error,
                iconColor: PREMIUM_ICON_COLORS.error,
                subtitle: 'Critical items',
              },
              {
                label: 'Applied',
                value: 0,
                icon: <CheckCircle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.success,
                iconColor: PREMIUM_ICON_COLORS.success,
                subtitle: 'Successfully applied',
              },
            ]}
          />
        ) : null}

        {/* Filters */}
        <RecommendationsFilters
          status={status}
          type={type}
          provider={provider}
          priority={priority}
          onStatusChange={setStatus}
          onTypeChange={setType}
          onProviderChange={setProvider}
          onPriorityChange={setPriority}
          onClearFilters={handleClearFilters}
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
          <Card className="p-6 border-l-4 border-error bg-error/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-error flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  Error Loading Recommendations
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  There was an error loading your recommendations. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetchRecommendations()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingRecommendations && (
          <GridCardsSkeleton count={6} />
        )}

        {/* Empty State */}
        {!isLoadingRecommendations &&
          !recommendationsError &&
          recommendations.length === 0 && (
            <PremiumEmptyState
              {...EmptyStateVariants.noRecommendations()}
              description={
                status || type || provider || priority
                  ? 'No recommendations match your current filters. Try adjusting your search criteria or clearing all filters.'
                  : 'You\'re all caught up! There are no active recommendations at this time. Generate new recommendations to discover cost optimization opportunities.'
              }
              action={
                status || type || provider || priority
                  ? {
                      label: 'Clear Filters',
                      onClick: handleClearFilters,
                      variant: 'outline' as const,
                    }
                  : {
                      label: 'Generate Recommendations',
                      onClick: handleGenerateRecommendations,
                      variant: 'default' as const,
                    }
              }
            />
          )}

        {/* Recommendations Grid */}
        {!isLoadingRecommendations &&
          !recommendationsError &&
          recommendations.length > 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              role="list"
              aria-label="Recommendations"
            >
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} role="listitem">
                  <RecommendationCard
                    recommendation={recommendation}
                    onApply={handleApplyClick}
                    onDismiss={handleDismissClick}
                    onViewDetails={handleViewDetailsClick}
                    isApplying={
                      isApplying &&
                      selectedRecommendation?.id === recommendation.id
                    }
                    isDismissing={
                      isDismissing &&
                      selectedRecommendation?.id === recommendation.id
                    }
                  />
                </div>
              ))}
            </div>
          )}

        {/* Pagination */}
        {!isLoadingRecommendations &&
          !recommendationsError &&
          totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber: number;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
      </div>

      {/* Modals */}
      <ApplyModal
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
        recommendation={selectedRecommendation}
        onConfirm={handleApplyConfirm}
        isLoading={isApplying}
      />

      <DismissModal
        open={dismissModalOpen}
        onOpenChange={setDismissModalOpen}
        recommendation={selectedRecommendation}
        onConfirm={handleDismissConfirm}
        isLoading={isDismissing}
      />

      <RecommendationDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        recommendation={selectedRecommendation}
        onApply={() => {
          setDetailModalOpen(false);
          if (selectedRecommendation) {
            handleApplyClick(selectedRecommendation);
          }
        }}
        onDismiss={() => {
          setDetailModalOpen(false);
          if (selectedRecommendation) {
            handleDismissClick(selectedRecommendation);
          }
        }}
        isApplying={isApplying}
        isDismissing={isDismissing}
      />
    </div>
  );
}
