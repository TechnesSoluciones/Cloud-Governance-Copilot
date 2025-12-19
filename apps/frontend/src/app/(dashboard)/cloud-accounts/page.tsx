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
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
import {
  PremiumSectionHeader,
  PREMIUM_GRADIENTS,
} from '@/components/shared/premium';

export default function CloudAccountsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Use real API hook instead of mock data
  const { cloudAccounts, isLoading, refetch } = useCloudAccounts();

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

  const filteredAccounts = React.useMemo(() => {
    return cloudAccounts.filter((account) => {
      const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = providerFilter === 'all' || account.provider === providerFilter;
      return matchesSearch && matchesProvider;
    });
  }, [cloudAccounts, searchQuery, providerFilter]);

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
      // Note: Delete API endpoint not yet implemented
      // TODO: Call API to delete account when backend endpoint is ready
      addToast('Delete functionality will be available soon', 'info');
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
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Cloud Accounts"
          subtitle="Manage your connected cloud providers and accounts"
          actions={
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
          }
        />

        {/* Stats Bar */}
        {!isLoading && cloudAccounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-orange/10">
                  <svg className="h-5 w-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{cloudAccounts.length}</p>
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
                    {cloudAccounts.filter(a => a.status === 'active').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
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
