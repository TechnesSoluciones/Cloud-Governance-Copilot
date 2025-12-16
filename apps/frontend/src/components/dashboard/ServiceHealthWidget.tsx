/**
 * Service Health Widget Component
 *
 * Displays Azure Service Health status on the dashboard
 *
 * Features:
 * - Overall health status indicator
 * - Active incidents counter
 * - Recent events list
 * - Auto-refresh every 10 minutes
 * - Critical incident alerts
 * - Link to detailed service health page
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ServiceHealthStatus {
  overallStatus: 'available' | 'degraded' | 'unavailable' | 'unknown';
  lastChecked: string;
  activeIncidents: number;
  activeMaintenances: number;
  affectedServices: string[];
  affectedRegions: string[];
}

interface ServiceHealthEvent {
  id: string;
  eventId: string;
  title: string;
  eventType: 'incident' | 'maintenance' | 'informational';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: string;
  impactStart: string;
  affectedRegions: string[];
}

interface ServiceHealthWidgetProps {
  accountId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function ServiceHealthWidget({
  accountId,
  autoRefresh = true,
  refreshInterval = 10 * 60 * 1000, // 10 minutes
}: ServiceHealthWidgetProps) {
  const [status, setStatus] = useState<ServiceHealthStatus | null>(null);
  const [recentEvents, setRecentEvents] = useState<ServiceHealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch service health status
  const fetchServiceHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch status
      const statusResponse = await fetch(
        `/api/v1/service-health/stats${accountId ? `?accountId=${accountId}` : ''}`
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to fetch service health status');
      }

      const statusData = await statusResponse.json();

      // Fetch recent cached events
      const eventsResponse = await fetch(
        `/api/v1/service-health/cached-events?limit=3&status=active${accountId ? `&accountId=${accountId}` : ''}`
      );

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch service health events');
      }

      const eventsData = await eventsResponse.json();

      // Transform stats to status format
      const transformedStatus: ServiceHealthStatus = {
        overallStatus:
          statusData.data.criticalEvents > 0
            ? 'unavailable'
            : statusData.data.activeIncidents > 0
              ? 'degraded'
              : 'available',
        lastChecked: new Date().toISOString(),
        activeIncidents: statusData.data.activeIncidents || 0,
        activeMaintenances: statusData.data.plannedMaintenance || 0,
        affectedServices: [],
        affectedRegions: [],
      };

      setStatus(transformedStatus);
      setRecentEvents(
        eventsData.data.map((event: any) => ({
          id: event.id,
          eventId: event.event_id,
          title: event.title,
          eventType: event.event_type,
          severity: event.severity,
          status: event.status,
          impactStart: event.impact_start,
          affectedRegions: event.affected_regions || [],
        }))
      );
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching service health:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchServiceHealth();
  }, [accountId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchServiceHealth();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, accountId]);

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'available':
        return {
          icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
          text: 'All systems operational',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'degraded':
        return {
          icon: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />,
          text: 'Service degradation detected',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'unavailable':
        return {
          icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
          text: 'Service outage detected',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          icon: <InformationCircleIcon className="h-6 w-6 text-gray-500" />,
          text: 'Status unknown',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  // Get event severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Info
          </span>
        );
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Unable to load service health
            </h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={fetchServiceHealth}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const statusDisplay = getStatusDisplay(status.overallStatus);

  return (
    <div className={`bg-white rounded-lg shadow border ${statusDisplay.borderColor}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusDisplay.icon}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Azure Service Health
              </h3>
              <p className="text-sm text-gray-500">
                Last checked: {formatTimeAgo(status.lastChecked)}
              </p>
            </div>
          </div>
          <button
            onClick={fetchServiceHealth}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`px-6 py-3 ${statusDisplay.bgColor}`}>
        <p className="text-sm font-medium text-gray-900">{statusDisplay.text}</p>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">
              {status.activeIncidents}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Active Incidents</p>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <WrenchScrewdriverIcon className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">
              {status.activeMaintenances}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Planned Maintenance</p>
        </div>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Events</h4>
          <div className="space-y-3">
            {recentEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {event.eventType === 'incident' ? (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  ) : event.eventType === 'maintenance' ? (
                    <WrenchScrewdriverIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    <InformationCircleIcon className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {getSeverityBadge(event.severity)}
                    {event.affectedRegions.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {event.affectedRegions[0]}
                        {event.affectedRegions.length > 1 &&
                          ` +${event.affectedRegions.length - 1}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(event.impactStart)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <Link
          href="/service-health"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center"
        >
          View Full Service Health
          <svg
            className="ml-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
