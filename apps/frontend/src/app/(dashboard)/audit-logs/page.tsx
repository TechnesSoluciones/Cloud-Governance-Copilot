'use client';

import * as React from 'react';
import { AuditEvent } from '@/components/dashboard/RecentActivity';
import { AuditFilters, AuditFiltersState } from '@/components/audit/AuditFilters';
import { AuditTable } from '@/components/audit/AuditTable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { StatCardGridSkeleton } from '@/components/ui/skeleton';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from 'lucide-react';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PremiumStatsBar,
  PREMIUM_GRADIENTS,
  PREMIUM_ICON_COLORS,
  PREMIUM_TRANSITIONS,
} from '@/components/shared/premium';

const ITEMS_PER_PAGE = 20;

export default function AuditLogsPage() {
  const { addToast } = useToast();
  // Note: Audit logs feature requires backend API implementation
  const [isLoading] = React.useState(false);
  const [isLoadingStats] = React.useState(false);
  const [allLogs] = React.useState<AuditEvent[]>([]);
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
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Audit Logs"
          subtitle="Track all activities across your cloud accounts"
          actions={
            <Button variant="outline" size="lg" onClick={handleExport} className="shadow-lg">
              <Download className="h-5 w-5 mr-2" aria-hidden="true" />
              Export
            </Button>
          }
        />

        {/* Premium Stats Bar */}
        {isLoadingStats ? (
          <StatCardGridSkeleton count={4} />
        ) : (
          <PremiumStatsBar
            stats={[
              {
                label: 'Total Events',
                value: filteredLogs.length,
                icon: <FileText className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.azure,
                iconColor: PREMIUM_ICON_COLORS.azure,
                subtitle: 'Audit records',
              },
              {
                label: 'Success',
                value: filteredLogs.filter((log) => log.status === 'success').length,
                icon: <CheckCircle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.success,
                iconColor: PREMIUM_ICON_COLORS.success,
                subtitle: 'Completed actions',
              },
              {
                label: 'Failures',
                value: filteredLogs.filter((log) => log.status === 'failure').length,
                icon: <XCircle className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.error,
                iconColor: PREMIUM_ICON_COLORS.error,
                subtitle: 'Failed attempts',
              },
              {
                label: 'Pending',
                value: filteredLogs.filter((log) => log.status === 'pending').length,
                icon: <Clock className="h-14 w-14" />,
                iconBg: PREMIUM_GRADIENTS.warning,
                iconColor: PREMIUM_ICON_COLORS.warning,
                subtitle: 'In progress',
              },
            ]}
          />
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
    </div>
  );
}
