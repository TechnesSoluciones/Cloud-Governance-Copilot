/**
 * Incident Detail V2 Page
 * CloudNexus Design - Individual Incident Details
 */

'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'updated' | 'comment' | 'status_change' | 'assignment' | 'resolved';
  user: string;
  title: string;
  description?: string;
}

interface AffectedResource {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down';
  region: string;
}

interface RemediationStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignee?: string;
}

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'resources' | 'remediation'>(
    'overview'
  );

  // Mock data - in real app, fetch based on params.id
  const incident = {
    id: id,
    title: 'High CPU utilization on production EC2 instances',
    description:
      'Multiple EC2 instances in the production environment are experiencing sustained high CPU utilization above 90%, causing performance degradation and application slowdowns. This issue was first detected by CloudWatch alarms and has affected customer-facing services.',
    severity: 'critical' as const,
    status: 'investigating' as const,
    provider: 'AWS' as const,
    affectedResources: 8,
    createdAt: '2024-12-26T09:30:00Z',
    updatedAt: '2024-12-26T10:15:00Z',
    assignee: {
      name: 'John Doe',
      email: 'john.doe@company.com',
    },
    tags: ['performance', 'production', 'compute'],
    priority: 'P1',
    region: 'us-east-1',
  };

  const timelineEvents: TimelineEvent[] = [
    {
      id: '1',
      timestamp: '2024-12-26T10:15:00Z',
      type: 'comment',
      user: 'John Doe',
      title: 'Added comment',
      description: 'Investigating CPU spike. Analyzing CloudWatch metrics and application logs.',
    },
    {
      id: '2',
      timestamp: '2024-12-26T10:00:00Z',
      type: 'assignment',
      user: 'System',
      title: 'Incident assigned',
      description: 'Assigned to John Doe based on on-call rotation.',
    },
    {
      id: '3',
      timestamp: '2024-12-26T09:45:00Z',
      type: 'status_change',
      user: 'Jane Smith',
      title: 'Status changed to Investigating',
      description: 'Team notified and investigation started.',
    },
    {
      id: '4',
      timestamp: '2024-12-26T09:30:00Z',
      type: 'created',
      user: 'CloudWatch Alarm',
      title: 'Incident created',
      description: 'Auto-created from CloudWatch alarm: HighCPUUtilization-prod',
    },
  ];

  const affectedResources: AffectedResource[] = [
    {
      id: '1',
      name: 'i-0abc123def456',
      type: 'EC2 Instance',
      status: 'degraded',
      region: 'us-east-1a',
    },
    {
      id: '2',
      name: 'i-0def456ghi789',
      type: 'EC2 Instance',
      status: 'degraded',
      region: 'us-east-1a',
    },
    {
      id: '3',
      name: 'i-0ghi789jkl012',
      type: 'EC2 Instance',
      status: 'degraded',
      region: 'us-east-1b',
    },
    {
      id: '4',
      name: 'prod-web-asg',
      type: 'Auto Scaling Group',
      status: 'healthy',
      region: 'us-east-1',
    },
    {
      id: '5',
      name: 'prod-alb',
      type: 'Application Load Balancer',
      status: 'healthy',
      region: 'us-east-1',
    },
  ];

  const remediationSteps: RemediationStep[] = [
    {
      id: '1',
      step: 1,
      title: 'Identify root cause',
      description: 'Review CloudWatch metrics, application logs, and recent deployments',
      status: 'completed',
      assignee: 'John Doe',
    },
    {
      id: '2',
      step: 2,
      title: 'Implement temporary mitigation',
      description: 'Scale up Auto Scaling Group to distribute load',
      status: 'in_progress',
      assignee: 'John Doe',
    },
    {
      id: '3',
      step: 3,
      title: 'Deploy fix',
      description: 'Deploy application patch to optimize resource usage',
      status: 'pending',
    },
    {
      id: '4',
      step: 4,
      title: 'Monitor and verify',
      description: 'Monitor CPU metrics for 30 minutes to confirm resolution',
      status: 'pending',
    },
    {
      id: '5',
      step: 5,
      title: 'Post-incident review',
      description: 'Schedule post-mortem meeting and document lessons learned',
      status: 'pending',
    },
  ];

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'add_circle';
      case 'updated':
        return 'edit';
      case 'comment':
        return 'comment';
      case 'status_change':
        return 'sync_alt';
      case 'assignment':
        return 'person_add';
      case 'resolved':
        return 'check_circle';
      default:
        return 'circle';
    }
  };

  const getResourceStatusColor = (status: AffectedResource['status']) => {
    switch (status) {
      case 'healthy':
        return 'operational';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'critical';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-primary-400 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Incidents
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <BadgeV2 variant={incident.severity} size="lg">
                  {incident.severity}
                </BadgeV2>
                <BadgeV2 variant={incident.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}>
                  {incident.provider}
                </BadgeV2>
                <BadgeV2 variant="default">{incident.priority}</BadgeV2>
                <StatusIndicatorV2
                  status={
                    incident.status === 'investigating' ? 'warning' :
                    incident.status === 'open' ? 'critical' : 'operational'
                  }
                  label={incident.status}
                />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {incident.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Incident #{incident.id} • Created {formatTimestamp(incident.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit
              </button>
              <button className="px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500">dns</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {incident.affectedResources}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Affected Resources</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500">schedule</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">45m</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-500">person</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {incident.assignee.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Assigned To</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500">public</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {incident.region}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Region</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex">
              {[
                { id: 'overview', label: 'Overview', icon: 'info' },
                { id: 'timeline', label: 'Timeline', icon: 'history' },
                { id: 'resources', label: 'Affected Resources', icon: 'dns' },
                { id: 'remediation', label: 'Remediation Steps', icon: 'checklist' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2',
                    activeTab === tab.id
                      ? 'text-brand-primary-400 border-b-2 border-brand-primary-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Description
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {incident.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Impact Assessment
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                    <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-warning text-lg mt-0.5">
                          warning
                        </span>
                        <span>Customer-facing services experiencing degraded performance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-warning text-lg mt-0.5">
                          warning
                        </span>
                        <span>API response times increased by 200%</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-warning text-lg mt-0.5">
                          warning
                        </span>
                        <span>8 EC2 instances affected across 2 availability zones</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {incident.tags.map((tag) => (
                      <BadgeV2 key={tag} variant="default">
                        {tag}
                      </BadgeV2>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Activity Timeline
                </h3>
                <div className="space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            event.type === 'created' && 'bg-blue-500/10',
                            event.type === 'status_change' && 'bg-purple-500/10',
                            event.type === 'assignment' && 'bg-indigo-500/10',
                            event.type === 'comment' && 'bg-slate-100 dark:bg-slate-800',
                            event.type === 'resolved' && 'bg-success/10'
                          )}
                        >
                          <span
                            className={cn(
                              'material-symbols-outlined text-lg',
                              event.type === 'created' && 'text-blue-500',
                              event.type === 'status_change' && 'text-purple-500',
                              event.type === 'assignment' && 'text-indigo-500',
                              event.type === 'comment' && 'text-slate-500',
                              event.type === 'resolved' && 'text-success'
                            )}
                          >
                            {getTimelineIcon(event.type)}
                          </span>
                        </div>
                        {index < timelineEvents.length - 1 && (
                          <div className="w-0.5 h-16 bg-slate-200 dark:bg-slate-800 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {event.title}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          by {event.user}
                        </p>
                        {event.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Resources Tab */}
            {activeTab === 'resources' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Affected Resources ({affectedResources.length})
                </h3>
                <div className="space-y-3">
                  {affectedResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-2xl text-indigo-500">
                          dns
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {resource.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {resource.type} • {resource.region}
                          </div>
                        </div>
                      </div>
                      <StatusIndicatorV2
                        status={getResourceStatusColor(resource.status)}
                        label={resource.status}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Steps Tab */}
            {activeTab === 'remediation' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Remediation Plan
                </h3>
                <div className="space-y-4">
                  {remediationSteps.map((step) => (
                    <div
                      key={step.id}
                      className={cn(
                        'flex gap-4 p-4 rounded-lg border-2 transition-all',
                        step.status === 'completed' &&
                          'bg-success/5 border-success/20',
                        step.status === 'in_progress' &&
                          'bg-blue-500/5 border-blue-500/20',
                        step.status === 'pending' &&
                          'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                          step.status === 'completed' && 'bg-success text-white',
                          step.status === 'in_progress' &&
                            'bg-blue-500 text-white animate-pulse',
                          step.status === 'pending' &&
                            'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {step.status === 'completed' ? (
                          <span className="material-symbols-outlined text-lg">check</span>
                        ) : (
                          step.step
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {step.title}
                          </h4>
                          {step.status === 'in_progress' && (
                            <BadgeV2 variant="info" size="sm">
                              In Progress
                            </BadgeV2>
                          )}
                          {step.status === 'completed' && (
                            <BadgeV2 variant="success" size="sm" icon="check">
                              Completed
                            </BadgeV2>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {step.description}
                        </p>
                        {step.assignee && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Assigned to: {step.assignee}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
