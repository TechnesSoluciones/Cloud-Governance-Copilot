/**
 * Service Breakdown Component
 * Displays cost breakdown by service with chart and table views
 *
 * Features:
 * - Toggle between pie chart and bar chart visualization
 * - Sortable table view with search/filter
 * - Top 10 services highlighted
 * - Export to CSV functionality
 * - Responsive design
 * - Accessible controls and labels
 * - Loading and empty states
 */

'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Table2,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Server,
} from 'lucide-react';
import { formatCurrency, formatPercentage, exportToCSV } from '@/lib/costs';

export interface ServiceData {
  service: string;
  cost: number;
  percentage: number;
  provider?: 'AWS' | 'Azure';
  currency?: string;
}

export interface ServiceBreakdownProps {
  services: ServiceData[];
  viewMode: 'chart' | 'table';
  onViewModeChange: (mode: 'chart' | 'table') => void;
  currency?: string;
  isLoading?: boolean;
  chartType?: 'pie' | 'bar';
  onChartTypeChange?: (type: 'pie' | 'bar') => void;
}

type SortField = 'service' | 'cost' | 'percentage' | 'provider';
type SortDirection = 'asc' | 'desc';

// Color palette for charts
const COLORS = [
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

/**
 * Custom tooltip for charts
 */
const ChartTooltip: React.FC<TooltipProps<number, string> & { currency: string }> = ({
  active,
  payload,
  currency,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-900 mb-2">{data.service}</p>
      <div className="space-y-1">
        {data.provider && (
          <p className="text-xs text-gray-600">
            Provider: <span className="font-medium">{data.provider}</span>
          </p>
        )}
        <p className="text-sm text-gray-600">
          Cost: <span className="font-medium text-gray-900">{formatCurrency(data.cost, currency)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Share: <span className="font-medium text-gray-900">{formatPercentage(data.percentage)}</span>
        </p>
      </div>
    </div>
  );
};

/**
 * Pie Chart View
 */
const PieChartView: React.FC<{ services: ServiceData[]; currency: string }> = ({
  services,
  currency,
}) => {
  const top10 = services.slice(0, 10);

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top10}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ service, percentage }) =>
              `${service}: ${formatPercentage(percentage, 0)}`
            }
            outerRadius={120}
            fill="#8884d8"
            dataKey="cost"
          >
            {top10.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Bar Chart View
 */
const BarChartView: React.FC<{ services: ServiceData[]; currency: string }> = ({
  services,
  currency,
}) => {
  const top10 = services.slice(0, 10);

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top10} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="service"
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
            stroke="#6b7280"
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value, currency)}
            fontSize={12}
            stroke="#6b7280"
          />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
            {top10.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Table View with sorting and search
 */
const TableView: React.FC<{
  services: ServiceData[];
  currency: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}> = ({ services, currency, searchQuery, onSearchChange }) => {
  const [sortField, setSortField] = useState<SortField>('cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let filtered = services;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((service) =>
        // Defensive programming: validate before using toLowerCase
        service?.service && typeof service.service === 'string' &&
        service.service.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === 'string') {
        // Defensive programming: validate before using toLowerCase
        aValue = (aValue && typeof aValue === 'string') ? aValue.toLowerCase() : '';
        bValue = (bValue && typeof bValue === 'string') ? (bValue as string).toLowerCase() : '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [services, searchQuery, sortField, sortDirection]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" aria-hidden="true" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
          aria-label="Search services"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('service')}
                  className="flex items-center font-semibold hover:text-gray-900"
                  aria-label={`Sort by service ${sortField === 'service' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                >
                  Service
                  <SortIcon field="service" />
                </button>
              </TableHead>
              {services.some(s => s.provider) && (
                <TableHead>
                  <button
                    onClick={() => handleSort('provider')}
                    className="flex items-center font-semibold hover:text-gray-900"
                    aria-label={`Sort by provider ${sortField === 'provider' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                  >
                    Provider
                    <SortIcon field="provider" />
                  </button>
                </TableHead>
              )}
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort('cost')}
                  className="flex items-center justify-end w-full font-semibold hover:text-gray-900"
                  aria-label={`Sort by cost ${sortField === 'cost' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                >
                  Cost
                  <SortIcon field="cost" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort('percentage')}
                  className="flex items-center justify-end w-full font-semibold hover:text-gray-900"
                  aria-label={`Sort by percentage ${sortField === 'percentage' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
                >
                  % of Total
                  <SortIcon field="percentage" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No services found
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((service, index) => (
                <TableRow key={`${service.service}-${index}`}>
                  <TableCell className="font-medium">{service.service}</TableCell>
                  {services.some(s => s.provider) && (
                    <TableCell>
                      {service.provider && (
                        <Badge
                          variant={service.provider === 'AWS' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {service.provider}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {formatCurrency(service.cost, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-medium">{formatPercentage(service.percentage)}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, service.percentage)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600">
        Showing {filteredServices.length} of {services.length} services
      </p>
    </div>
  );
};

/**
 * Loading skeleton
 */
const ServiceBreakdownSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="h-96 w-full animate-pulse bg-gray-100 rounded-lg" />
    </CardContent>
  </Card>
);

/**
 * Service Breakdown Component
 */
export const ServiceBreakdown: React.FC<ServiceBreakdownProps> = ({
  services,
  viewMode,
  onViewModeChange,
  currency = 'USD',
  isLoading = false,
  chartType = 'pie',
  onChartTypeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Show loading state
  if (isLoading) {
    return <ServiceBreakdownSkeleton />;
  }

  // Handle export
  const handleExport = () => {
    const exportData = services.map(s => ({
      Service: s.service,
      Provider: s.provider || 'N/A',
      Cost: s.cost,
      Currency: currency,
      Percentage: s.percentage,
    }));
    exportToCSV(exportData, `cost-by-service-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cost by Service</CardTitle>
            <CardDescription>
              Breakdown of costs across all cloud services
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Export button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              aria-label="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export
            </Button>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg p-1">
              {viewMode === 'chart' && onChartTypeChange && (
                <>
                  <Button
                    variant={chartType === 'pie' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onChartTypeChange('pie')}
                    aria-label="Pie chart view"
                    className="h-8"
                  >
                    <PieChartIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant={chartType === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onChartTypeChange('bar')}
                    aria-label="Bar chart view"
                    className="h-8"
                  >
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </>
              )}
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('table')}
                aria-label="Table view"
                className="h-8"
              >
                <Table2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Server className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No Service Data Available
            </h3>
            <p className="text-sm text-gray-600 max-w-sm">
              There is no service cost data available for the selected period.
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <>
            {chartType === 'pie' ? (
              <PieChartView services={services} currency={currency} />
            ) : (
              <BarChartView services={services} currency={currency} />
            )}
            {services.length > 10 && (
              <p className="text-sm text-gray-600 text-center mt-4">
                Showing top 10 services. Switch to table view to see all {services.length} services.
              </p>
            )}
          </>
        ) : (
          <TableView
            services={services}
            currency={currency}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </CardContent>
    </Card>
  );
};
