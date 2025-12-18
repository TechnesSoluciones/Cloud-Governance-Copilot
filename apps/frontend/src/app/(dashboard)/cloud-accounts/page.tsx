'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AccountCard, CloudAccount } from '@/components/cloud-accounts/AccountCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect, SelectOption } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { GridCardsSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function CloudAccountsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<CloudAccount[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [providerFilter, setProviderFilter] = React.useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<string | null>(null);

  const providerOptions: SelectOption[] = [
    { value: 'all', label: 'All Providers' },
    { value: 'aws', label: 'AWS' },
    { value: 'azure', label: 'Azure' },
    { value: 'gcp', label: 'GCP' },
  ];

  React.useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      // Mock data - in production, fetch from API
      setAccounts([
        {
          id: '1',
          name: 'Production AWS',
          provider: 'aws',
          status: 'connected',
          lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          resourceCount: 142,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        },
        {
          id: '2',
          name: 'Development Azure',
          provider: 'azure',
          status: 'connected',
          lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          resourceCount: 38,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        },
        {
          id: '3',
          name: 'Staging GCP',
          provider: 'gcp',
          status: 'error',
          lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          resourceCount: 27,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
      ]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = providerFilter === 'all' || account.provider === providerFilter;
      return matchesSearch && matchesProvider;
    });
  }, [accounts, searchQuery, providerFilter]);

  const handleEdit = (accountId: string) => {
    router.push(`/cloud-accounts/${accountId}/edit`);
  };

  const handleDelete = (accountId: string) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      // In production, call API to delete account
      setAccounts((prev) => prev.filter((a) => a.id !== accountToDelete));
      addToast('Cloud account deleted successfully', 'success');
    } catch (error) {
      addToast('Failed to delete cloud account', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleTest = async (accountId: string) => {
    try {
      // In production, call API to test connection
      addToast('Testing connection...', 'info');
      setTimeout(() => {
        addToast('Connection test successful', 'success');
      }, 2000);
    } catch (error) {
      addToast('Connection test failed', 'error');
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      // In production, call API to sync account
      addToast('Syncing account...', 'info');
      setTimeout(() => {
        addToast('Account synced successfully', 'success');
      }, 2000);
    } catch (error) {
      addToast('Failed to sync account', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Header Section - Enhanced */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Cloud Accounts
            </h1>
            <p className="text-base text-muted-foreground">
              Manage your connected cloud providers across AWS, Azure, and GCP
            </p>
          </div>
          <Button
            onClick={() => router.push('/cloud-accounts/new')}
            size="lg"
            className="bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Account
          </Button>
        </div>

        {/* Stats Bar - NEW */}
        {!isLoading && accounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-orange/10">
                  <svg className="h-5 w-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
                  <p className="text-sm text-muted-foreground">Total Accounts</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {accounts.filter(a => a.status === 'connected').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {accounts.reduce((sum, a) => sum + (a.resourceCount || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Resources</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section - Enhanced */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="search"
                  placeholder="Search accounts by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 h-11 border-2 focus:border-brand-orange/50"
                  aria-label="Search cloud accounts"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <SimpleSelect
                value={providerFilter}
                onValueChange={setProviderFilter}
                options={providerOptions}
                placeholder="Filter by provider"
                aria-label="Filter by provider"
              />
            </div>
          </div>
        </div>

        {/* Accounts Grid - Enhanced spacing */}
        {isLoading ? (
          <GridCardsSkeleton count={3} />
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={
                <svg className="h-20 w-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              }
              title={searchQuery || providerFilter !== 'all' ? 'No accounts found' : 'No cloud accounts yet'}
              description={
                searchQuery || providerFilter !== 'all'
                  ? 'Try adjusting your search or filters to find what you are looking for'
                  : 'Get started by connecting your first cloud provider account'
              }
              action={
                !searchQuery && providerFilter === 'all'
                  ? {
                      label: 'Add Your First Account',
                      onClick: () => router.push('/cloud-accounts/new'),
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-8">
            {filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => handleEdit(account.id)}
                onDelete={() => handleDelete(account.id)}
                onTest={() => handleTest(account.id)}
                onSync={() => handleSync(account.id)}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogHeader>
            <DialogTitle>Delete Cloud Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cloud account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}
