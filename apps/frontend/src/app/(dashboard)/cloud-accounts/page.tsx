/**
 * Cloud Accounts V2 Page
 * CloudNexus Design - Cloud Accounts Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { listCloudAccounts, deleteCloudAccount, testCloudAccountConnection, type CloudAccount as ApiCloudAccount } from '@/lib/api/cloud-accounts';

interface CloudAccount {
  id: string;
  name: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  accountId: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  region: string;
  lastSync: string;
  connectionDate: string;
}

export default function CloudAccountsV2Page() {
  const router = useRouter();
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load cloud accounts from API
  useEffect(() => {
    const loadAccounts = async () => {
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await listCloudAccounts((session as any).accessToken);

        if (response.success && response.data) {
          // Transform API data to local format
          const transformedAccounts: CloudAccount[] = response.data.map((acc: ApiCloudAccount) => ({
            id: acc.id,
            name: acc.accountName,
            provider: acc.provider.toUpperCase() as 'AWS' | 'Azure' | 'GCP',
            accountId: acc.accountIdentifier,
            status: acc.status === 'connected' ? 'connected' : acc.status === 'error' ? 'error' : 'pending',
            region: 'N/A', // Region not available in API yet
            lastSync: acc.lastSync ? new Date(acc.lastSync).toLocaleString() : 'Never',
            connectionDate: new Date(acc.createdAt).toLocaleDateString(),
          }));

          setAccounts(transformedAccounts);
        }
      } catch (error) {
        console.error('Failed to load cloud accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [session]);

  const connectedAccounts = accounts.filter((a) => a.status === 'connected').length;
  const errorAccounts = accounts.filter((a) => a.status === 'error').length;

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountId.includes(searchQuery)
  );

  const handleConnectNewAccount = () => {
    router.push('/cloud-accounts/new');
  };

  const handleSync = async (accountId: string) => {
    if (!session) return;

    try {
      const response = await testCloudAccountConnection(accountId, (session as any).accessToken);
      if (response.success) {
        alert(`Sync successful: ${response.data?.message}`);
        // Reload accounts
        const accountsResponse = await listCloudAccounts((session as any).accessToken);
        if (accountsResponse.success && accountsResponse.data) {
          const transformedAccounts: CloudAccount[] = accountsResponse.data.map((acc: ApiCloudAccount) => ({
            id: acc.id,
            name: acc.accountName,
            provider: acc.provider.toUpperCase() as 'AWS' | 'Azure' | 'GCP',
            accountId: acc.accountIdentifier,
            status: acc.status === 'connected' ? 'connected' : acc.status === 'error' ? 'error' : 'pending',
            region: 'N/A',
            lastSync: acc.lastSync ? new Date(acc.lastSync).toLocaleString() : 'Never',
            connectionDate: new Date(acc.createdAt).toLocaleDateString(),
          }));
          setAccounts(transformedAccounts);
        }
      } else {
        alert('Sync failed');
      }
    } catch (error) {
      console.error('Failed to sync account:', error);
      alert('Failed to sync account');
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!session) return;

    if (!confirm(`Are you sure you want to delete "${accountName}"?`)) {
      return;
    }

    try {
      const response = await deleteCloudAccount(accountId, (session as any).accessToken);
      if (response.success) {
        // Remove from local state
        setAccounts(accounts.filter(acc => acc.id !== accountId));
        alert('Account deleted successfully');
      } else {
        alert('Failed to delete account');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  const getStatusColor = (status: CloudAccount['status']) => {
    switch (status) {
      case 'connected':
        return 'operational';
      case 'disconnected':
        return 'warning';
      case 'error':
        return 'critical';
      default:
        return 'operational';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-brand-primary-400 animate-spin mb-4">
              sync
            </span>
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading cloud accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Cloud Accounts
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your connected cloud provider accounts
            </p>
          </div>

          <button
            onClick={handleConnectNewAccount}
            className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Connect New Account
          </button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="cloud_done"
            label="Connected Accounts"
            value={connectedAccounts}
            variant="emerald"
            comparison={`${accounts.length} total accounts`}
          />
          <KPICardV2
            icon="cloud_queue"
            label="Pending Accounts"
            value={accounts.filter((a) => a.status === 'pending').length}
            variant="indigo"
            comparison="Awaiting verification"
          />
          <KPICardV2
            icon="verified"
            label="AWS Accounts"
            value={accounts.filter((a) => a.provider === 'AWS').length}
            variant="blue"
          />
          <KPICardV2
            icon="error"
            label="Accounts with Errors"
            value={errorAccounts}
            variant="red"
            comparison={errorAccounts > 0 ? 'Requires attention' : 'All operational'}
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <BadgeV2 variant="aws" size="sm">
                AWS ({accounts.filter((a) => a.provider === 'AWS').length})
              </BadgeV2>
              <BadgeV2 variant="azure" size="sm">
                Azure ({accounts.filter((a) => a.provider === 'Azure').length})
              </BadgeV2>
              <BadgeV2 variant="gcp" size="sm">
                GCP ({accounts.filter((a) => a.provider === 'GCP').length})
              </BadgeV2>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Connected Since
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {account.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {account.accountId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <BadgeV2
                          variant={account.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                          size="sm"
                        >
                          {account.provider}
                        </BadgeV2>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {account.region}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusIndicatorV2
                        status={getStatusColor(account.status)}
                        label={account.status}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {account.lastSync}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {account.connectionDate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSync(account.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Sync account"
                        >
                          <span className="material-symbols-outlined text-slate-500 text-lg">
                            sync
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete account"
                        >
                          <span className="material-symbols-outlined text-red-500 text-lg">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredAccounts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
                cloud_off
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No accounts found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Try adjusting your search or connect a new account
              </p>
              <button
                onClick={handleConnectNewAccount}
                className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Connect New Account
              </button>
            </div>
          )}
        </div>
    </div>
  );
}
