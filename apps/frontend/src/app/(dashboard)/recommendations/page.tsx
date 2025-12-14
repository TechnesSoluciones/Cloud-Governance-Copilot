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
import { Sparkles, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
} from '@/lib/api/recommendations';
import { Provider } from '@/lib/api/finops';
import { RecommendationsKPIs } from '@/components/recommendations/RecommendationsKPIs';
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Recommendations
            </h1>
            <p className="mt-2 text-base text-gray-600">
              AI-powered cost optimization recommendations for your cloud infrastructure
            </p>
          </div>
          <Button
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white"
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                Generate Recommendations
              </>
            )}
          </Button>
        </div>

        {/* KPIs */}
        {isLoadingSummary ? (
          <StatCardGridSkeleton count={4} />
        ) : (
          <RecommendationsKPIs summary={summaryData} isLoading={false} />
        )}

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
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Sparkles className="h-12 w-12 text-gray-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No recommendations found
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 max-w-md">
                    {status || type || provider || priority
                      ? 'Try adjusting your filters to see more recommendations.'
                      : 'Generate recommendations to get started with cost optimization.'}
                  </p>
                </div>
                {(status || type || provider || priority) && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
                {!status && !type && !provider && !priority && (
                  <Button
                    onClick={handleGenerateRecommendations}
                    disabled={isGenerating}
                    className="bg-brand-orange hover:bg-brand-orange-dark text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                    Generate Recommendations
                  </Button>
                )}
              </div>
            </Card>
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
