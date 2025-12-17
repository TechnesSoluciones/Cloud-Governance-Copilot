/**
 * Incident Detail Page
 * Displays detailed information about a specific incident with tabs
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useIncidentById,
  useUpdateIncidentStatus,
  useAddIncidentComment,
  extractIncidentData,
} from '@/hooks/useIncidents';
import { useAlertById } from '@/hooks/useIncidents';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { SeverityIndicator } from '@/components/incidents/SeverityIndicator';
import { IncidentTimeline } from '@/components/incidents/IncidentTimeline';
import { AlertDetailModal } from '@/components/incidents/AlertDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  MessageCircle,
  Server,
  Bell,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IncidentStatus } from '@/lib/api/incidents';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [commentText, setCommentText] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Fetch incident details
  const {
    data: incidentResponse,
    isLoading,
    error,
    refetch,
  } = useIncidentById(incidentId);

  const incident = extractIncidentData(incidentResponse);

  // Fetch selected alert details
  const { data: alertResponse, isLoading: isAlertLoading } = useAlertById(
    selectedAlertId || '',
    { enabled: !!selectedAlertId }
  );

  const selectedAlert = alertResponse?.data?.data;

  // Mutations
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateIncidentStatus();
  const { mutate: addComment, isPending: isAddingComment } = useAddIncidentComment();

  const handleBack = () => {
    router.push('/incidents');
  };

  const handleStatusChange = (status: IncidentStatus) => {
    updateStatus(
      {
        id: incidentId,
        data: { status },
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    addComment(
      {
        incidentId,
        data: { content: commentText },
      },
      {
        onSuccess: () => {
          setCommentText('');
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Failed to load incident details. Please try again later.
          </AlertDescription>
        </Alert>
        <Button onClick={handleBack} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Incidents
        </Button>
      </div>
    );
  }

  const canAcknowledge = incident.status === 'new';
  const canResolve = incident.status !== 'resolved' && incident.status !== 'closed';

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Back Button */}
      <Button
        onClick={handleBack}
        variant="ghost"
        className="gap-2"
        aria-label="Back to incidents list"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Incidents
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SeverityIndicator severity={incident.severity} />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {incident.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <IncidentStatusBadge status={incident.status} />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <time dateTime={incident.createdAt}>
                  Created {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                </time>
              </div>
              {incident.assignedTo && (
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Assigned to {incident.assignedTo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canAcknowledge && (
              <Button
                onClick={() => handleStatusChange('acknowledged')}
                disabled={isUpdatingStatus}
                className="gap-2"
                aria-label="Acknowledge incident"
              >
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Acknowledge
              </Button>
            )}
            {canResolve && (
              <Button
                onClick={() => handleStatusChange('resolved')}
                disabled={isUpdatingStatus}
                variant="outline"
                className="gap-2"
                aria-label="Resolve incident"
              >
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                Resolve
              </Button>
            )}
            <Button
              onClick={() => handleStatusChange('investigating')}
              disabled={isUpdatingStatus || incident.status === 'investigating'}
              variant="outline"
              className="gap-2"
              aria-label="Mark as investigating"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Investigating
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <Badge variant="secondary" className="ml-2">
              {incident.alerts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resources">
            Resources
            <Badge variant="secondary" className="ml-2">
              {incident.resources.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Description
                </h3>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {incident.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Severity
                  </h3>
                  <div className="mt-1">
                    <SeverityIndicator severity={incident.severity} size="sm" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </h3>
                  <div className="mt-1">
                    <IncidentStatusBadge status={incident.status} />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Affected Resources
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {incident.affectedResourcesCount} resources
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Created At
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(incident.createdAt), 'PPpp')}
                  </p>
                </div>

                {incident.acknowledgedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Acknowledged At
                    </h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {format(new Date(incident.acknowledgedAt), 'PPpp')}
                    </p>
                  </div>
                )}

                {incident.resolvedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Resolved At
                    </h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {format(new Date(incident.resolvedAt), 'PPpp')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Comments ({incident.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Comments */}
              {incident.comments.length > 0 ? (
                <div className="space-y-4">
                  {incident.comments.map(comment => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {comment.author}
                          </p>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                        <time
                          dateTime={comment.createdAt}
                          className="text-xs text-gray-600 dark:text-gray-400"
                        >
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No comments yet</p>
              )}

              {/* Add Comment Form */}
              <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                <label htmlFor="comment" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Add Comment
                </label>
                <Textarea
                  id="comment"
                  placeholder="Share updates, findings, or notes about this incident..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={3}
                  aria-label="Comment text"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isAddingComment}
                  className="w-full sm:w-auto"
                  aria-label="Add comment"
                >
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" aria-hidden="true" />
                Related Alerts ({incident.alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incident.alerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert Name</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Fired At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incident.alerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell>
                          <SeverityIndicator severity={alert.severity} showText={false} />
                        </TableCell>
                        <TableCell>{alert.resourceName}</TableCell>
                        <TableCell>
                          <time dateTime={alert.firedAt}>
                            {formatDistanceToNow(new Date(alert.firedAt), { addSuffix: true })}
                          </time>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              alert.status === 'active' && 'bg-red-500 hover:bg-red-600 text-white',
                              alert.status === 'resolved' && 'bg-green-500 hover:bg-green-600 text-white',
                              alert.status === 'suppressed' && 'bg-gray-500 hover:bg-gray-600 text-white'
                            )}
                          >
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAlertId(alert.id)}
                            aria-label={`View details for ${alert.name}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No alerts found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" aria-hidden="true" />
                Affected Resources ({incident.resources.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incident.resources.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incident.resources.map(resource => (
                      <TableRow key={resource.id}>
                        <TableCell className="font-medium">{resource.name}</TableCell>
                        <TableCell>{resource.type}</TableCell>
                        <TableCell>{resource.location}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{resource.provider.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              resource.status === 'running' && 'bg-green-500 hover:bg-green-600 text-white',
                              resource.status === 'stopped' && 'bg-gray-500 hover:bg-gray-600 text-white',
                              resource.status === 'error' && 'bg-red-500 hover:bg-red-600 text-white'
                            )}
                          >
                            {resource.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No resources found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" aria-hidden="true" />
                Incident Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentTimeline events={incident.timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert || null}
        isLoading={isAlertLoading}
        isOpen={!!selectedAlertId}
        onClose={() => setSelectedAlertId(null)}
      />
    </div>
  );
}
