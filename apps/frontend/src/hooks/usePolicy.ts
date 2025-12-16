/**
 * React Query Hooks for Azure Policy
 * Provides type-safe data fetching with caching, automatic refetching, and error handling
 */

import {
  useQuery,
  UseQueryResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Type Definitions

export interface PolicyAssignment {
  id: string;
  name: string;
  displayName: string;
  description: string;
  policyDefinitionId: string;
  scope: string;
  enforcementMode: 'Default' | 'DoNotEnforce';
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ComplianceResult {
  totalResources: number;
  compliantResources: number;
  nonCompliantResources: number;
  compliancePercentage: number;
  policyBreakdown: PolicyComplianceBreakdown[];
  trend?: ComplianceTrend;
  lastEvaluated: Date;
}

export interface PolicyComplianceBreakdown {
  policyId: string;
  policyName: string;
  category: string;
  compliantCount: number;
  nonCompliantCount: number;
  compliancePercentage: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceTrend {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  direction: 'improving' | 'declining' | 'stable';
}

export interface NonCompliantResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  location: string;
  resourceGroup: string;
  policyAssignmentId: string;
  policyDefinitionId: string;
  policyDefinitionName: string;
  complianceState: string;
  reason: string;
  timestamp: Date;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  remediationSteps?: string[];
}

export interface PolicyDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  policyType: 'BuiltIn' | 'Custom' | 'Static';
  mode: string;
  category: string;
  effect: string;
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PolicyEvaluationResult {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  overallCompliance: 'Compliant' | 'NonCompliant' | 'Conflict';
  evaluationTimestamp: Date;
  violatedPolicies: ViolatedPolicy[];
  compliantPolicies: CompliantPolicy[];
  remediationSuggestions: RemediationSuggestion[];
}

export interface ViolatedPolicy {
  policyId: string;
  policyName: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  effect: string;
  reason: string;
}

export interface CompliantPolicy {
  policyId: string;
  policyName: string;
  category: string;
}

export interface RemediationSuggestion {
  policyId: string;
  policyName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  steps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

export interface PolicySecurityScore {
  overallScore: number;
  maxScore: number;
  compliancePercentage: number;
  categoryScores: CategoryScore[];
  trend: ScoreTrend;
  impactSummary: ImpactSummary;
  lastCalculated: Date;
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  weight: number;
  policyCount: number;
  violationCount: number;
}

export interface ScoreTrend {
  current: number;
  previousWeek: number;
  change: number;
  direction: 'improving' | 'declining' | 'stable';
}

export interface ImpactSummary {
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  totalViolations: number;
}

export interface PolicyRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: number;
  affectedResources: AffectedResource[];
  remediationSteps: RemediationStep[];
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  costImplication: 'none' | 'low' | 'medium' | 'high';
  automatable: boolean;
  relatedPolicies: string[];
  complianceFrameworks: string[];
  metadata: {
    policyId: string;
    policyName: string;
    violationCount: number;
    firstDetected: Date;
    lastUpdated: Date;
  };
}

export interface AffectedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  location: string;
  resourceGroup: string;
  violationReason: string;
}

export interface RemediationStep {
  order: number;
  description: string;
  type: 'manual' | 'automated' | 'semi-automated';
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  azureCliCommand?: string;
  portalLink?: string;
}

export interface ComplianceGapAnalysis {
  criticalGaps: string[];
  highPriorityGaps: string[];
  recommendations: string[];
  estimatedRemediationTime: string;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

// Query Key Factories
export const policyKeys = {
  all: ['policy'] as const,
  assignments: (accountId: string) => [...policyKeys.all, 'assignments', accountId] as const,
  compliance: (accountId: string) => [...policyKeys.all, 'compliance', accountId] as const,
  nonCompliant: (accountId: string, policyId?: string) =>
    [...policyKeys.all, 'non-compliant', accountId, policyId] as const,
  definitions: (accountId: string) => [...policyKeys.all, 'definitions', accountId] as const,
  securityScore: (accountId: string) => [...policyKeys.all, 'security-score', accountId] as const,
  recommendations: (accountId: string) => [...policyKeys.all, 'recommendations', accountId] as const,
  gapAnalysis: (accountId: string) => [...policyKeys.all, 'gap-analysis', accountId] as const,
};

// API Helper Functions

async function fetchWithAuth<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook: usePolicy
 * Main hook that combines compliance and non-compliant resources
 *
 * @param accountId - Azure subscription ID
 * @param policyId - Optional policy ID to filter non-compliant resources
 * @returns Combined compliance and non-compliant resources data
 *
 * @example
 * const { compliance, nonCompliantResources, isLoading } = usePolicy('sub-123');
 */
export function usePolicy(accountId: string, policyId?: string) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const complianceQuery = usePolicyCompliance(accountId, { enabled: !!accountId });
  const nonCompliantQuery = useNonCompliantResources(
    accountId,
    policyId,
    { enabled: !!accountId }
  );

  return {
    compliance: complianceQuery.data?.data,
    nonCompliantResources: nonCompliantQuery.data?.data?.resources,
    isLoading: complianceQuery.isLoading || nonCompliantQuery.isLoading,
    error: complianceQuery.error || nonCompliantQuery.error,
    refetch: () => {
      complianceQuery.refetch();
      nonCompliantQuery.refetch();
    },
  };
}

/**
 * Hook: usePolicyAssignments
 * Fetch all policy assignments for an account
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with policy assignments
 *
 * @example
 * const { data, isLoading } = usePolicyAssignments('sub-123');
 */
export function usePolicyAssignments(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ assignments: PolicyAssignment[] }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ assignments: PolicyAssignment[] }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.assignments(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ assignments: PolicyAssignment[] }>>(
        `${API_BASE_URL}/api/v1/policy/assignments?accountId=${accountId}`,
        token
      ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    ...options,
  });
}

/**
 * Hook: usePolicyCompliance
 * Fetch overall policy compliance status
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with compliance data
 *
 * @example
 * const { data, isLoading } = usePolicyCompliance('sub-123');
 */
export function usePolicyCompliance(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ compliance: ComplianceResult }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ compliance: ComplianceResult }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.compliance(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ compliance: ComplianceResult }>>(
        `${API_BASE_URL}/api/v1/policy/compliance?accountId=${accountId}`,
        token
      ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    ...options,
  });
}

/**
 * Hook: useNonCompliantResources
 * Fetch non-compliant resources
 *
 * @param accountId - Azure subscription ID
 * @param policyId - Optional policy ID filter
 * @param options - React Query options
 * @returns Query result with non-compliant resources
 *
 * @example
 * const { data, isLoading } = useNonCompliantResources('sub-123', 'policy-id');
 */
export function useNonCompliantResources(
  accountId: string,
  policyId?: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ resources: NonCompliantResource[] }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ resources: NonCompliantResource[] }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const url = policyId
    ? `${API_BASE_URL}/api/v1/policy/non-compliant?accountId=${accountId}&policyId=${policyId}`
    : `${API_BASE_URL}/api/v1/policy/non-compliant?accountId=${accountId}`;

  return useQuery({
    queryKey: policyKeys.nonCompliant(accountId, policyId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ resources: NonCompliantResource[] }>>(url, token),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: usePolicyDefinitions
 * Fetch available policy definitions
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with policy definitions
 *
 * @example
 * const { data, isLoading } = usePolicyDefinitions('sub-123');
 */
export function usePolicyDefinitions(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ definitions: PolicyDefinition[] }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ definitions: PolicyDefinition[] }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.definitions(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ definitions: PolicyDefinition[] }>>(
        `${API_BASE_URL}/api/v1/policy/definitions?accountId=${accountId}`,
        token
      ),
    staleTime: 60 * 60 * 1000, // 1 hour (definitions change rarely)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    ...options,
  });
}

/**
 * Hook: usePolicySecurityScore
 * Fetch policy-based security score
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with security score
 *
 * @example
 * const { data, isLoading } = usePolicySecurityScore('sub-123');
 */
export function usePolicySecurityScore(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ score: PolicySecurityScore }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ score: PolicySecurityScore }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.securityScore(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ score: PolicySecurityScore }>>(
        `${API_BASE_URL}/api/v1/policy/security-score?accountId=${accountId}`,
        token
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: usePolicyRecommendations
 * Fetch security recommendations based on policy violations
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with recommendations
 *
 * @example
 * const { data, isLoading } = usePolicyRecommendations('sub-123');
 */
export function usePolicyRecommendations(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ recommendations: PolicyRecommendation[] }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ recommendations: PolicyRecommendation[] }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.recommendations(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ recommendations: PolicyRecommendation[] }>>(
        `${API_BASE_URL}/api/v1/policy/recommendations?accountId=${accountId}`,
        token
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook: useComplianceGapAnalysis
 * Fetch compliance gap analysis
 *
 * @param accountId - Azure subscription ID
 * @param options - React Query options
 * @returns Query result with gap analysis
 *
 * @example
 * const { data, isLoading } = useComplianceGapAnalysis('sub-123');
 */
export function useComplianceGapAnalysis(
  accountId: string,
  options?: Omit<UseQueryOptions<ApiResponse<{ analysis: ComplianceGapAnalysis }>>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<{ analysis: ComplianceGapAnalysis }>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: policyKeys.gapAnalysis(accountId),
    queryFn: () =>
      fetchWithAuth<ApiResponse<{ analysis: ComplianceGapAnalysis }>>(
        `${API_BASE_URL}/api/v1/policy/gap-analysis?accountId=${accountId}`,
        token
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}
