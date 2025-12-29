/**
 * Audit Logs V2 Page
 * CloudNexus Design - Audit Logs with Advanced Filtering
 */

'use client';

import { useState, useEffect } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { cn } from '@/lib/utils';
import {
  useAuditLogs,
  useAuditStats,
  extractAuditLogsData,
  extractStatsData,
} from '@/hooks/useAuditLogs';
import { AuditLog as ApiAuditLog } from '@/lib/api/audit-logs';

interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'access' | 'config';
  resource: string;
  resourceType: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  status: 'success' | 'failed' | 'warning';
  ipAddress: string;
  location: string;
  details?: string;
}

// Helper function to transform API audit log to component format
function transformAuditLog(apiLog: ApiAuditLog): AuditLog {
  const formatProvider = (provider: string): 'AWS' | 'Azure' | 'GCP' => {
    if (provider === 'AZURE') return 'Azure';
    if (provider === 'AWS') return 'AWS';
    return 'GCP';
  };

  return {
    id: apiLog.id,
    timestamp: apiLog.timestamp,
    user: {
      name: apiLog.userName,
      email: apiLog.userEmail,
    },
    action: apiLog.action,
    actionType: apiLog.actionType,
    resource: apiLog.resourceId,
    resourceType: apiLog.resourceType,
    provider: formatProvider(apiLog.provider),
    status: apiLog.status,
    ipAddress: apiLog.ipAddress,
    location: apiLog.location || 'Unknown',
    details: apiLog.details,
  };
}

export default function AuditLogsV2Page() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch audit logs from API
  const { data: logsData, refetch: refetchLogs, isLoading: isLoadingLogs } = useAuditLogs({
    search: searchQuery || undefined,
    actionType: filterAction !== 'all' ? filterAction as any : undefined,
    provider: filterProvider !== 'all' ? filterProvider as any : undefined,
    status: filterStatus !== 'all' ? filterStatus as any : undefined,
  });

  // Fetch stats from API
  const { data: statsData, isLoading: isLoadingStats } = useAuditStats();

  // Transform and set logs when data changes
  useEffect(() => {
    const data = extractAuditLogsData(logsData);
    if (data?.data) {
      const transformed = data.data.map(transformAuditLog);
      setLogs(transformed);
    }
    setIsLoading(isLoadingLogs || isLoadingStats);
  }, [logsData, isLoadingLogs, isLoadingStats]);

  const stats = extractStatsData(statsData);
  const totalEvents = stats?.totalEvents || logs.length;
  const uniqueUsers = stats?.uniqueUsers || new Set(logs.map((l) => l.user.email)).size;
  const criticalActions = stats?.criticalActions || logs.filter(
    (l) => l.actionType === 'delete' || l.status === 'failed'
  ).length;
  const successRate = stats?.successRate || (logs.length > 0 ? Math.round(
    (logs.filter((l) => l.status === 'success').length / logs.length) * 100
  ) : 0);

  const handleExport = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-export-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs;

  const getActionIcon = (actionType: AuditLog['actionType']) => {
    switch (actionType) {
      case 'create':
        return 'add_circle';
      case 'update':
        return 'edit';
      case 'delete':
        return 'delete';
      case 'access':
        return 'visibility';
      case 'config':
        return 'settings';
      default:
        return 'circle';
    }
  };

  const getStatusBadge = (status: AuditLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <BadgeV2 variant="success" size="sm" icon="check_circle">
            Success
          </BadgeV2>
        );
      case 'failed':
        return (
          <BadgeV2 variant="error" size="sm" icon="cancel">
            Failed
          </BadgeV2>
        );
      case 'warning':
        return (
          <BadgeV2 variant="warning" size="sm" icon="warning">
            Warning
          </BadgeV2>
        );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hr ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Audit Logs
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track all user activities and system events across your infrastructure
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Advanced filters coming soon')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">filter_list</span>
              Advanced Filters
            </button>
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export Logs
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="history"
            label="Total Events"
            value={isLoading ? '...' : totalEvents.toLocaleString()}
            variant="blue"
            comparison="Last 24 hours"
          />
          <KPICardV2
            icon="group"
            label="Active Users"
            value={isLoading ? '...' : uniqueUsers.toString()}
            variant="indigo"
            comparison={isLoading ? '...' : `${totalEvents} total actions`}
          />
          <KPICardV2
            icon="warning"
            label="Critical Actions"
            value={isLoading ? '...' : criticalActions.toString()}
            variant="orange"
            comparison="Deletes & failures"
          />
          <KPICardV2
            icon="check_circle"
            label="Success Rate"
            value={isLoading ? '...' : `${successRate}%`}
            variant="emerald"
            comparison="Overall reliability"
          />
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            {/* Action Type Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="access">Access</option>
              <option value="config">Config</option>
            </select>

            {/* Provider Filter */}
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
            >
              <option value="all">All Providers</option>
              <option value="AWS">AWS</option>
              <option value="Azure">Azure</option>
              <option value="GCP">GCP</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">
                        {formatTimestamp(log.timestamp)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary-400 flex items-center justify-center text-white text-sm font-semibold">
                          {log.user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {log.user.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {log.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'material-symbols-outlined text-lg',
                            log.actionType === 'delete' && 'text-error',
                            log.actionType === 'create' && 'text-success',
                            log.actionType === 'update' && 'text-blue-500',
                            log.actionType === 'access' && 'text-indigo-500',
                            log.actionType === 'config' && 'text-purple-500'
                          )}
                        >
                          {getActionIcon(log.actionType)}
                        </span>
                        <div>
                          <div className="text-sm text-slate-900 dark:text-white">
                            {log.action}
                          </div>
                          {log.details && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {log.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <code className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                          {log.resource}
                        </code>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {log.resourceType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <BadgeV2
                        variant={log.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                        size="sm"
                      >
                        {log.provider}
                      </BadgeV2>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {log.location}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {log.ipAddress}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
                search_off
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No logs found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{filteredLogs.length}</span> of{' '}
              <span className="font-semibold">{totalEvents}</span> events
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                Previous
              </button>
              <button className="px-3 py-1.5 bg-brand-primary-400 text-white rounded-lg text-sm font-medium hover:bg-brand-primary-500 transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                3
              </button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
