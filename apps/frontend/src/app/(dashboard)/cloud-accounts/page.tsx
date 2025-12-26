/**
 * Cloud Accounts V2 Page
 * CloudNexus Design - Cloud Accounts Management
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayoutV2 } from '@/components/layout/DashboardLayoutV2';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';

interface CloudAccount {
  id: string;
  name: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  accountId: string;
  status: 'connected' | 'disconnected' | 'error';
  region: string;
  resourceCount: number;
  monthlyCost: number;
  lastSync: string;
  connectionDate: string;
  tags: string[];
}

const mockAccounts: CloudAccount[] = [
  {
    id: '1',
    name: 'Production AWS',
    provider: 'AWS',
    accountId: '123456789012',
    status: 'connected',
    region: 'us-east-1',
    resourceCount: 847,
    monthlyCost: 8450,
    lastSync: '2 minutes ago',
    connectionDate: '2024-01-15',
    tags: ['production', 'critical'],
  },
  {
    id: '2',
    name: 'Development Azure',
    provider: 'Azure',
    accountId: 'sub-abc-def-ghi',
    status: 'connected',
    region: 'westeurope',
    resourceCount: 234,
    monthlyCost: 2340,
    lastSync: '5 minutes ago',
    connectionDate: '2024-02-20',
    tags: ['development', 'testing'],
  },
  {
    id: '3',
    name: 'Analytics GCP',
    provider: 'GCP',
    accountId: 'project-analytics-123',
    status: 'connected',
    region: 'us-central1',
    resourceCount: 159,
    monthlyCost: 1660,
    lastSync: '10 minutes ago',
    connectionDate: '2024-03-10',
    tags: ['analytics', 'data'],
  },
  {
    id: '4',
    name: 'Staging AWS',
    provider: 'AWS',
    accountId: '987654321098',
    status: 'connected',
    region: 'eu-west-1',
    resourceCount: 312,
    monthlyCost: 1890,
    lastSync: '1 hour ago',
    connectionDate: '2024-01-20',
    tags: ['staging'],
  },
  {
    id: '5',
    name: 'Legacy Azure',
    provider: 'Azure',
    accountId: 'sub-legacy-001',
    status: 'error',
    region: 'eastus',
    resourceCount: 78,
    monthlyCost: 450,
    lastSync: '2 days ago',
    connectionDate: '2023-11-05',
    tags: ['legacy', 'deprecated'],
  },
];

export default function CloudAccountsV2Page() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<CloudAccount[]>(mockAccounts);
  const [searchQuery, setSearchQuery] = useState('');

  const connectedAccounts = accounts.filter((a) => a.status === 'connected').length;
  const totalResources = accounts.reduce((sum, a) => sum + a.resourceCount, 0);
  const totalCost = accounts.reduce((sum, a) => sum + a.monthlyCost, 0);
  const errorAccounts = accounts.filter((a) => a.status === 'error').length;

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountId.includes(searchQuery)
  );

  const handleConnectNewAccount = () => {
    router.push('/cloud-accounts-v2/new');
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

  return (
    <DashboardLayoutV2>
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
            icon="dns"
            label="Total Resources"
            value={totalResources.toLocaleString()}
            variant="indigo"
            trend={{
              direction: 'up',
              percentage: 8,
              label: 'vs last month',
            }}
          />
          <KPICardV2
            icon="attach_money"
            label="Total Monthly Cost"
            value={`$${totalCost.toLocaleString()}`}
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 5,
            }}
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
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Monthly Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Last Sync
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
                        <div className="flex gap-1 mt-2">
                          {account.tags.map((tag) => (
                            <BadgeV2 key={tag} variant="default" size="sm">
                              {tag}
                            </BadgeV2>
                          ))}
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
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">
                          dns
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {account.resourceCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500 text-lg">
                          attach_money
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ${account.monthlyCost.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {account.lastSync}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-slate-500 text-lg">
                            sync
                          </span>
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-slate-500 text-lg">
                            settings
                          </span>
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-slate-500 text-lg">
                            more_vert
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
    </DashboardLayoutV2>
  );
}
