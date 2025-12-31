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
import {
  listCloudAccounts,
  deleteCloudAccount,
  testCloudAccountConnection,
  updateCloudAccountCredentials,
  type CloudAccount as ApiCloudAccount,
  type CloudAccountCredentials
} from '@/lib/api/cloud-accounts';
import { CloudProvider } from '@/config/features';

interface CloudAccount {
  id: string;
  name: string;
  provider: CloudProvider | 'Azure'; // Azure-only mode: CloudProvider = 'azure'
  accountId: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  region: string;
  lastSync: string;
  connectionDate: string;
}

/* TEMPORALMENTE DESHABILITADO - Azure-only mode (2025-12-31)
 * Tipo original multi-cloud:
 * provider: 'AWS' | 'Azure' | 'GCP';
 */

export default function CloudAccountsV2Page() {
  const router = useRouter();
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CloudAccount | null>(null);
  const [editCredentials, setEditCredentials] = useState<CloudAccountCredentials>({});
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleEdit = (account: CloudAccount) => {
    setEditingAccount(account);
    setEditCredentials({}); // Clear credentials (user must enter new ones)
    setIsEditModalOpen(true);
  };

  const handleUpdateCredentials = async () => {
    if (!session || !editingAccount) return;

    // Validate credentials based on provider
    const provider = editingAccount.provider;
    if (provider === 'AWS') {
      if (!editCredentials.accessKeyId || !editCredentials.secretAccessKey) {
        alert('Please enter AWS Access Key ID and Secret Access Key');
        return;
      }
    } else if (provider === 'Azure') {
      if (
        !editCredentials.tenantId ||
        !editCredentials.clientId ||
        !editCredentials.clientSecret ||
        !editCredentials.subscriptionId
      ) {
        alert('Please enter all Azure credentials (Tenant ID, Client ID, Client Secret, Subscription ID)');
        return;
      }
    } else if (provider === 'GCP') {
      if (!editCredentials.projectId || !editCredentials.clientEmail || !editCredentials.privateKey) {
        alert('Please enter all GCP credentials (Project ID, Client Email, Private Key JSON)');
        return;
      }
    }

    setIsUpdating(true);
    try {
      const response = await updateCloudAccountCredentials(
        editingAccount.id,
        editCredentials,
        (session as any).accessToken
      );

      if (response.success) {
        alert('Credentials updated successfully!');
        setIsEditModalOpen(false);
        setEditingAccount(null);
        setEditCredentials({});

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
        alert(`Failed to update credentials: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update credentials:', error);
      alert('Failed to update credentials');
    } finally {
      setIsUpdating(false);
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
          {/* TEMPORALMENTE DESHABILITADO - Azure-only mode (2025-12-31)
          <KPICardV2
            icon="verified"
            label="AWS Accounts"
            value={accounts.filter((a) => a.provider === 'AWS').length}
            variant="blue"
          />
          */}
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
              {/* TEMPORALMENTE DESHABILITADO - Azure-only mode (2025-12-31)
              <BadgeV2 variant="aws" size="sm">
                AWS ({accounts.filter((a) => a.provider === 'AWS').length})
              </BadgeV2>
              */}
              <BadgeV2 variant="azure" size="sm">
                Azure ({accounts.filter((a) => a.provider === 'Azure').length})
              </BadgeV2>
              {/* TEMPORALMENTE DESHABILITADO - Azure-only mode (2025-12-31)
              <BadgeV2 variant="gcp" size="sm">
                GCP ({accounts.filter((a) => a.provider === 'GCP').length})
              </BadgeV2>
              */}
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
                          onClick={() => handleEdit(account)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit credentials"
                        >
                          <span className="material-symbols-outlined text-blue-500 text-lg">
                            edit
                          </span>
                        </button>
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

        {/* Edit Credentials Modal */}
        {isEditModalOpen && editingAccount && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Edit Credentials
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {editingAccount.name} ({editingAccount.provider})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingAccount(null);
                    setEditCredentials({});
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                      warning
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Security Notice
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        For security reasons, existing credentials cannot be displayed. Please enter new credentials to update this account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AWS Credentials */}
                {editingAccount.provider === 'AWS' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Access Key ID *
                      </label>
                      <input
                        type="text"
                        value={editCredentials.accessKeyId || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, accessKeyId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Secret Access Key *
                      </label>
                      <input
                        type="password"
                        value={editCredentials.secretAccessKey || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, secretAccessKey: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Region (Optional)
                      </label>
                      <input
                        type="text"
                        value={editCredentials.region || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, region: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>
                )}

                {/* Azure Credentials */}
                {editingAccount.provider === 'Azure' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Subscription ID *
                      </label>
                      <input
                        type="text"
                        value={editCredentials.subscriptionId || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, subscriptionId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="12345678-1234-1234-1234-123456789012"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tenant ID *
                      </label>
                      <input
                        type="text"
                        value={editCredentials.tenantId || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, tenantId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="12345678-1234-1234-1234-123456789012"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Client ID *
                      </label>
                      <input
                        type="text"
                        value={editCredentials.clientId || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, clientId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="12345678-1234-1234-1234-123456789012"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Client Secret *
                      </label>
                      <input
                        type="password"
                        value={editCredentials.clientSecret || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, clientSecret: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="Enter client secret"
                      />
                    </div>
                  </div>
                )}

                {/* GCP Credentials */}
                {editingAccount.provider === 'GCP' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Project ID *
                      </label>
                      <input
                        type="text"
                        value={editCredentials.projectId || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, projectId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="my-project-id"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Client Email *
                      </label>
                      <input
                        type="email"
                        value={editCredentials.clientEmail || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, clientEmail: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                        placeholder="service-account@project-id.iam.gserviceaccount.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Private Key JSON *
                      </label>
                      <textarea
                        value={editCredentials.privateKey || ''}
                        onChange={(e) => setEditCredentials({ ...editCredentials, privateKey: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400 font-mono text-sm"
                        placeholder="Paste the entire service account JSON key here"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-card-dark border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingAccount(null);
                    setEditCredentials({});
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCredentials}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">save</span>
                      Update Credentials
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
