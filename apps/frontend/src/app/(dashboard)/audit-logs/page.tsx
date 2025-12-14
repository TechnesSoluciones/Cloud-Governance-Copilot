'use client';

import * as React from 'react';
import { AuditEvent } from '@/components/dashboard/RecentActivity';
import { AuditFilters, AuditFiltersState } from '@/components/audit/AuditFilters';
import { AuditTable } from '@/components/audit/AuditTable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { StatCardGridSkeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 20;

export default function AuditLogsPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [allLogs, setAllLogs] = React.useState<AuditEvent[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortColumn, setSortColumn] = React.useState<keyof AuditEvent>('timestamp');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = React.useState<AuditFiltersState>({
    search: '',
    actionType: 'all',
    user: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  React.useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      // Mock data - in production, fetch from API
      const mockLogs: AuditEvent[] = [];
      const actions = [
        'Created EC2 instance',
        'Updated security group',
        'Deleted S3 bucket',
        'Created IAM user',
        'Modified RDS instance',
        'Updated CloudFormation stack',
        'Created Lambda function',
        'Deleted VPC',
        'Modified Auto Scaling group',
        'Created EBS volume',
      ];
      const users = [
        'john.doe@example.com',
        'jane.smith@example.com',
        'admin@example.com',
        'bob.jones@example.com',
        'alice.williams@example.com',
      ];
      const resources = [
        'i-0123456789abcdef0',
        'sg-0987654321fedcba',
        'my-test-bucket',
        'new-developer',
        'production-db',
        'main-stack',
        'data-processor',
        'vpc-legacy',
        'web-asg',
        'vol-backup-001',
      ];
      const statuses: AuditEvent['status'][] = ['success', 'failure', 'pending'];

      for (let i = 0; i < 50; i++) {
        mockLogs.push({
          id: `log-${i}`,
          timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
          user: users[Math.floor(Math.random() * users.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          resource: resources[Math.floor(Math.random() * resources.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
        });
      }

      setAllLogs(mockLogs);
      setIsLoading(false);
      setIsLoadingStats(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredLogs = React.useMemo(() => {
    let result = [...allLogs];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (log) =>
          log.user.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.resource.toLowerCase().includes(searchLower)
      );
    }

    if (filters.user) {
      result = result.filter((log) =>
        log.user.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      result = result.filter((log) => log.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter((log) => new Date(log.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((log) => new Date(log.timestamp) <= toDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number = a[sortColumn];
      let bValue: string | number = b[sortColumn];

      if (sortColumn === 'timestamp') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allLogs, filters, sortColumn, sortDirection]);

  const paginatedLogs = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const handleSort = (column: keyof AuditEvent, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFiltersChange = (newFilters: AuditFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      actionType: 'all',
      user: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
  };

  const handleExport = () => {
    addToast('Exporting audit logs...', 'info');
    // In production, trigger CSV/PDF export
    setTimeout(() => {
      addToast('Audit logs exported successfully', 'success');
    }, 2000);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all activities across your cloud accounts
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export
        </Button>
      </div>

      {/* Stats Summary */}
      {isLoadingStats ? (
        <StatCardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Events</div>
            <div className="text-2xl font-bold mt-1">{filteredLogs.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Success</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {filteredLogs.filter((log) => log.status === 'success').length}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Failures</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {filteredLogs.filter((log) => log.status === 'failure').length}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {filteredLogs.filter((log) => log.status === 'pending').length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <AuditFilters
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Results Info */}
      {filteredLogs.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredLogs.length)} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} results
        </div>
      )}

      {/* Table */}
      <AuditTable
        logs={paginatedLogs}
        isLoading={isLoading}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
