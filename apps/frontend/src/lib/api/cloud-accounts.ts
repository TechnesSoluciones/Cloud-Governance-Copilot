/**
 * Cloud Accounts API Client
 * Handles all API calls related to cloud account management
 */

import { apiGet, apiPost, apiPut, apiDelete, ApiResponse } from './client';

export interface CloudAccountCredentials {
  // AWS
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;

  // Azure
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  subscriptionId?: string;

  // GCP
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

export interface CloudAccountInput {
  provider: 'AWS' | 'AZURE' | 'GCP';
  name: string;
  accountIdentifier?: string;
  credentials: CloudAccountCredentials;
}

export interface CloudAccount {
  id: string;
  tenantId: string;
  provider: string;
  accountName: string;
  accountIdentifier: string;
  status: 'connected' | 'error' | 'pending';
  lastSync?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionResult {
  status: 'connected' | 'failed';
  message: string;
}

/**
 * Create a new cloud account
 */
export async function createCloudAccount(
  input: CloudAccountInput,
  token: string
): Promise<ApiResponse<CloudAccount>> {
  // Map frontend field names to backend expected names
  const requestBody = {
    provider: input.provider.toLowerCase(),
    accountName: input.name,
    accountIdentifier: input.accountIdentifier || getDefaultAccountIdentifier(input),
    credentials: input.credentials,
  };

  return apiPost<CloudAccount>('/cloud-accounts', requestBody, token);
}

/**
 * Get default account identifier based on provider and credentials
 */
function getDefaultAccountIdentifier(input: CloudAccountInput): string {
  if (input.provider === 'AZURE') {
    return input.credentials.subscriptionId || 'unknown';
  }
  if (input.provider === 'GCP') {
    return input.credentials.projectId || 'unknown';
  }
  // AWS - will be fetched from STS.getCallerIdentity in backend
  return 'pending';
}

/**
 * Test connection for an existing cloud account
 */
export async function testCloudAccountConnection(
  accountId: string,
  token: string
): Promise<ApiResponse<TestConnectionResult>> {
  return apiPost<TestConnectionResult>(`/cloud-accounts/${accountId}/test`, {}, token);
}

/**
 * Get all cloud accounts for current tenant
 */
export async function listCloudAccounts(
  token: string
): Promise<ApiResponse<CloudAccount[]>> {
  return apiGet<CloudAccount[]>('/cloud-accounts', token);
}

/**
 * Update cloud account credentials
 */
export async function updateCloudAccountCredentials(
  accountId: string,
  credentials: CloudAccountCredentials,
  token: string
): Promise<ApiResponse<CloudAccount>> {
  return apiPut<CloudAccount>(`/cloud-accounts/${accountId}/credentials`, { credentials }, token);
}

/**
 * Delete a cloud account
 */
export async function deleteCloudAccount(
  accountId: string,
  token: string
): Promise<ApiResponse<void>> {
  return apiDelete<void>(`/cloud-accounts/${accountId}`, token);
}
