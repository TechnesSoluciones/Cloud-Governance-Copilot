/**
 * Policy Compliance Widget
 *
 * Displays Azure Policy compliance status with interactive features:
 * - Compliance percentage by policy
 * - Color-coded status indicators
 * - Filter by category
 * - Click to view non-compliant resources
 * - Export to CSV
 */

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { usePolicy } from '../../hooks/usePolicy';
import { Skeleton } from '../ui/skeleton';

interface PolicyComplianceWidgetProps {
  accountId: string;
  onResourceClick?: (resourceId: string) => void;
}

export function PolicyComplianceWidget({
  accountId,
  onResourceClick,
}: PolicyComplianceWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  const {
    compliance,
    nonCompliantResources,
    isLoading,
    error,
  } = usePolicy(accountId, selectedPolicy || undefined);

  // Filter policies by search term and category
  const filteredPolicies = useMemo(() => {
    if (!compliance?.policyBreakdown) return [];

    return compliance.policyBreakdown.filter((policy) => {
      const matchesSearch = policy.policyName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || policy.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [compliance, searchTerm, categoryFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!compliance?.policyBreakdown) return [];
    const cats = new Set(compliance.policyBreakdown.map((p) => p.category));
    return Array.from(cats).sort();
  }, [compliance]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredPolicies.length) return;

    const headers = [
      'Policy Name',
      'Category',
      'Compliance %',
      'Compliant',
      'Non-Compliant',
      'Severity',
    ];

    const rows = filteredPolicies.map((policy) => [
      policy.policyName,
      policy.category,
      policy.compliancePercentage.toString(),
      policy.compliantCount.toString(),
      policy.nonCompliantCount.toString(),
      policy.severity || 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-compliance-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get compliance color
  const getComplianceColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get compliance background color
  const getComplianceBgColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Get severity badge color
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load policy compliance: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Policy Compliance</CardTitle>
          <div className="flex items-center gap-2">
            {compliance && (
              <div className="text-sm text-gray-600">
                Overall:{' '}
                <span
                  className={`font-semibold ${getComplianceColor(
                    compliance.compliancePercentage
                  )}`}
                >
                  {compliance.compliancePercentage.toFixed(1)}%
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!filteredPolicies.length}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {/* Policy Table */}
        {!isLoading && filteredPolicies.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="text-center">Compliant</TableHead>
                  <TableHead className="text-center">Non-Compliant</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow
                    key={policy.policyId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedPolicy(policy.policyId)}
                  >
                    <TableCell className="font-medium">
                      {policy.policyName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{policy.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${getComplianceBgColor(
                            policy.compliancePercentage
                          )}`}
                        >
                          <span
                            className={`text-sm font-bold ${getComplianceColor(
                              policy.compliancePercentage
                            )}`}
                          >
                            {policy.compliancePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{policy.compliantCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold">
                          {policy.nonCompliantCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {policy.severity && (
                        <Badge className={getSeverityColor(policy.severity)}>
                          {policy.severity}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPolicy(policy.policyId);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPolicies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No policies found matching your filters</p>
          </div>
        )}

        {/* Non-Compliant Resources Panel */}
        {selectedPolicy && nonCompliantResources && nonCompliantResources.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Non-Compliant Resources ({nonCompliantResources.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPolicy(null)}
              >
                Close
              </Button>
            </div>

            <div className="border rounded-md max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Resource Group</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonCompliantResources.map((resource) => (
                    <TableRow
                      key={resource.resourceId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onResourceClick?.(resource.resourceId)}
                    >
                      <TableCell className="font-medium">
                        {resource.resourceName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {resource.resourceType}
                      </TableCell>
                      <TableCell>{resource.location}</TableCell>
                      <TableCell>{resource.resourceGroup}</TableCell>
                      <TableCell>
                        {resource.severity && (
                          <Badge className={getSeverityColor(resource.severity)}>
                            {resource.severity}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
