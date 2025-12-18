/**
 * Hook: useCloudAccounts
 *
 * Centralized hook for fetching and managing cloud accounts across all dashboard pages.
 * Provides:
 * - List of user's cloud accounts
 * - Auto-selected account (first available)
 * - Loading and error states
 * - Account selection management
 *
 * @example
 * ```tsx
 * const { cloudAccounts, selectedAccount, isLoading, selectAccount } = useCloudAccounts();
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (!selectedAccount) return <EmptyState />;
 *
 * // Use selectedAccount.id for API calls
 * const { data } = useDashboard(selectedAccount.id);
 * ```
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface CloudAccount {
  id: string;
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  status: 'active' | 'inactive' | 'error';
  region?: string;
  tenantId: string;
  createdAt: string;
  lastSyncAt?: string;
}

export interface UseCloudAccountsResult {
  /** All cloud accounts for the current user */
  cloudAccounts: CloudAccount[];

  /** Currently selected cloud account */
  selectedAccount: CloudAccount | null;

  /** Loading state for initial fetch */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Function to change selected account */
  selectAccount: (accountId: string) => void;

  /** Refetch cloud accounts */
  refetch: () => Promise<void>;
}

export function useCloudAccounts(): UseCloudAccountsResult {
  const { data: session } = useSession();
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/cloud-accounts', {
        headers: {
          'Authorization': `Bearer ${(session as any).accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cloud accounts: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setCloudAccounts(data.data);

        // Auto-select first account if available and no account is currently selected
        if (data.data.length > 0 && !selectedAccount) {
          setSelectedAccount(data.data[0]);
        }

        // If previously selected account no longer exists, select first available
        if (selectedAccount && !data.data.find((acc: CloudAccount) => acc.id === selectedAccount.id)) {
          setSelectedAccount(data.data[0] || null);
        }
      } else {
        setCloudAccounts([]);
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error('Failed to fetch cloud accounts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setCloudAccounts([]);
      setSelectedAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch accounts on mount and when session changes
  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]); // Only re-fetch if user changes

  const selectAccount = (accountId: string) => {
    const account = cloudAccounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
    }
  };

  return {
    cloudAccounts,
    selectedAccount,
    isLoading,
    error,
    selectAccount,
    refetch: fetchAccounts,
  };
}

/**
 * Hook: useSelectedAccountId
 *
 * Simplified hook that returns only the selected account ID.
 * Useful for pages that just need the ID for API calls.
 *
 * @example
 * ```tsx
 * const accountId = useSelectedAccountId();
 * const { data } = useDashboard(accountId);
 * ```
 */
export function useSelectedAccountId(): string | null {
  const { selectedAccount } = useCloudAccounts();
  return selectedAccount?.id || null;
}
