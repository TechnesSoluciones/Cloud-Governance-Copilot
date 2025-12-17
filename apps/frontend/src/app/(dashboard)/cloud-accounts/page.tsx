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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected cloud providers
          </p>
        </div>
        <Button onClick={() => router.push('/cloud-accounts/new')}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            aria-label="Search cloud accounts"
          />
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

      {/* Accounts Grid */}
      {isLoading ? (
        <GridCardsSkeleton count={3} />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          }
          title={searchQuery || providerFilter !== 'all' ? 'No accounts found' : 'No cloud accounts yet'}
          description={
            searchQuery || providerFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Connect your first cloud account to get started'
          }
          action={
            !searchQuery && providerFilter === 'all'
              ? {
                  label: 'Add Cloud Account',
                  onClick: () => router.push('/cloud-accounts/new'),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <Button variant="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
