/**
 * Incidents V2 Page
 * CloudNexus Design - Incidents Management
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { KPICardV2 } from '@/components/ui/KPICardV2';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { useIncidents, useAlerts } from '@/hooks/useIncidents';
import { cn } from '@/lib/utils';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  provider: 'AWS' | 'Azure' | 'GCP';
  affectedResources: number;
  affectedServices: string[];
  createdAt: string;
  updatedAt: string;
  assignee?: {
    name: string;
    email: string;
  };
  tags: string[];
}

const mockIncidents: Incident[] = [
  {
    id: '1',
    title: 'High CPU utilization on production EC2 instances',
    description:
      'Multiple EC2 instances in the production environment are experiencing sustained high CPU utilization above 90%, causing performance degradation.',
    severity: 'critical',
    status: 'investigating',
    provider: 'AWS',
    affectedResources: 8,
    affectedServices: ['EC2', 'Auto Scaling', 'CloudWatch'],
    createdAt: '2024-12-26T09:30:00Z',
    updatedAt: '2024-12-26T10:15:00Z',
    assignee: {
      name: 'John Doe',
      email: 'john.doe@company.com',
    },
    tags: ['performance', 'production', 'compute'],
  },
  {
    id: '2',
    title: 'Database connection pool exhausted',
    description:
      'RDS database connection pool has reached maximum capacity, causing application timeouts and connection failures.',
    severity: 'high',
    status: 'open',
    provider: 'AWS',
    affectedResources: 1,
    affectedServices: ['RDS', 'Application'],
    createdAt: '2024-12-26T08:45:00Z',
    updatedAt: '2024-12-26T09:00:00Z',
    assignee: {
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
    },
    tags: ['database', 'connectivity', 'performance'],
  },
  {
    id: '3',
    title: 'Azure Storage blob service degradation',
    description:
      'Storage account in West Europe region is experiencing intermittent blob service availability issues.',
    severity: 'medium',
    status: 'investigating',
    provider: 'Azure',
    affectedResources: 12,
    affectedServices: ['Blob Storage', 'CDN'],
    createdAt: '2024-12-26T07:20:00Z',
    updatedAt: '2024-12-26T10:00:00Z',
    tags: ['storage', 'availability'],
  },
  {
    id: '4',
    title: 'Unauthorized access attempts detected',
    description:
      'Multiple failed login attempts from suspicious IP addresses detected on IAM accounts.',
    severity: 'high',
    status: 'open',
    provider: 'AWS',
    affectedResources: 3,
    affectedServices: ['IAM', 'CloudTrail', 'GuardDuty'],
    createdAt: '2024-12-26T06:15:00Z',
    updatedAt: '2024-12-26T06:30:00Z',
    assignee: {
      name: 'Mike Johnson',
      email: 'mike.j@company.com',
    },
    tags: ['security', 'authentication', 'compliance'],
  },
  {
    id: '5',
    title: 'GCP Kubernetes cluster node failure',
    description:
      'One node in the production GKE cluster has failed health checks and is not responding.',
    severity: 'medium',
    status: 'resolved',
    provider: 'GCP',
    affectedResources: 1,
    affectedServices: ['GKE', 'Compute Engine'],
    createdAt: '2024-12-25T22:00:00Z',
    updatedAt: '2024-12-26T01:30:00Z',
    assignee: {
      name: 'Sarah Wilson',
      email: 'sarah.w@company.com',
    },
    tags: ['kubernetes', 'infrastructure', 'reliability'],
  },
  {
    id: '6',
    title: 'S3 bucket public access misconfiguration',
    description:
      'Production S3 bucket was accidentally configured with public read access, exposing sensitive data.',
    severity: 'critical',
    status: 'resolved',
    provider: 'AWS',
    affectedResources: 1,
    affectedServices: ['S3', 'IAM'],
    createdAt: '2024-12-25T18:00:00Z',
    updatedAt: '2024-12-25T18:45:00Z',
    assignee: {
      name: 'David Lee',
      email: 'david.lee@company.com',
    },
    tags: ['security', 'data-breach', 'compliance'],
  },
  {
    id: '7',
    title: 'Load balancer health check failures',
    description:
      'Azure Application Gateway is reporting health check failures for backend pool instances.',
    severity: 'high',
    status: 'investigating',
    provider: 'Azure',
    affectedResources: 5,
    affectedServices: ['Application Gateway', 'Virtual Machines'],
    createdAt: '2024-12-25T16:30:00Z',
    updatedAt: '2024-12-26T09:45:00Z',
    tags: ['networking', 'availability', 'load-balancing'],
  },
  {
    id: '8',
    title: 'Disk space threshold exceeded',
    description:
      'Multiple EC2 instances have exceeded 85% disk utilization threshold.',
    severity: 'low',
    status: 'closed',
    provider: 'AWS',
    affectedResources: 4,
    affectedServices: ['EC2', 'EBS'],
    createdAt: '2024-12-25T14:00:00Z',
    updatedAt: '2024-12-25T20:00:00Z',
    tags: ['storage', 'capacity', 'monitoring'],
  },
];

export default function IncidentsV2Page() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  // Fetch incidents from backend
  const { data: incidentsData, isLoading, error, refetch } = useIncidents({
    page: 1,
    limit: 50,
  });

  // Extract incidents from API response
  const incidents = useMemo(() => {
    if (!incidentsData?.success || !incidentsData.data) return [];
    return incidentsData.data.data || [];
  }, [incidentsData]);

  // Calculate KPIs from real data
  const openIncidents = incidents.filter((i: any) => i.status === 'open' || i.status === 'investigating').length;
  const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical').length;
  const resolvedToday = incidents.filter(
    (i: any) =>
      (i.status === 'resolved' || i.status === 'closed') &&
      new Date(i.updatedAt).toDateString() === new Date().toDateString()
  ).length;
  const avgResolutionTime = '2.5h';

  // Loading state
  if (isLoading && incidents.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading incidents...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Incidents
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {error instanceof Error ? error.message : 'Unable to fetch incidents data'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.affectedServices.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesProvider = filterProvider === 'all' || incident.provider === filterProvider;

    return matchesSearch && matchesSeverity && matchesStatus && matchesProvider;
  });

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-error bg-error/10';
      case 'high':
        return 'text-warning bg-warning/10';
      case 'medium':
        return 'text-info bg-info/10';
      case 'low':
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
    }
  };

  const getStatusIndicator = (status: Incident['status']) => {
    switch (status) {
      case 'open':
        return <StatusIndicatorV2 status="critical" label="Open" />;
      case 'investigating':
        return <StatusIndicatorV2 status="warning" label="Investigating" />;
      case 'resolved':
        return <StatusIndicatorV2 status="operational" label="Resolved" />;
      case 'closed':
        return <StatusIndicatorV2 status="operational" label="Closed" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) {
      return `${Math.floor(diffMs / 60000)} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr ago`;
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Incidents</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track and manage infrastructure incidents across all cloud providers
            </p>
          </div>

          <button className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            Create Incident
          </button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="error"
            label="Open Incidents"
            value={openIncidents}
            variant="red"
            comparison="Requires attention"
          />
          <KPICardV2
            icon="priority_high"
            label="Critical"
            value={criticalIncidents}
            variant="orange"
            comparison={`${incidents.length} total incidents`}
          />
          <KPICardV2
            icon="check_circle"
            label="Resolved Today"
            value={resolvedToday}
            variant="emerald"
            trend={{
              direction: 'up',
              percentage: 15,
            }}
          />
          <KPICardV2
            icon="schedule"
            label="Avg Resolution Time"
            value={avgResolutionTime}
            variant="blue"
            comparison="Last 7 days"
          />
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Affected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => router.push(`/incidents-v2/${incident.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <BadgeV2 variant={incident.severity} size="sm">
                        {incident.severity}
                      </BadgeV2>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white mb-1">
                          {incident.title}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {incident.description}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {incident.tags.slice(0, 3).map((tag) => (
                            <BadgeV2 key={tag} variant="default" size="sm">
                              {tag}
                            </BadgeV2>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusIndicator(incident.status)}</td>
                    <td className="px-6 py-4">
                      <BadgeV2
                        variant={incident.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                        size="sm"
                      >
                        {incident.provider}
                      </BadgeV2>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                          <span className="material-symbols-outlined text-lg text-indigo-500">
                            dns
                          </span>
                          {incident.affectedResources} resources
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {incident.affectedServices.join(', ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {incident.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-primary-400 flex items-center justify-center text-white text-xs font-semibold">
                            {incident.assignee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {incident.assignee.name}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {formatTimestamp(incident.updatedAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredIncidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
                check_circle
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No incidents found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your filters or create a new incident
              </p>
            </div>
          )}
        </div>
    </div>
  );
}
