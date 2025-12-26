/**
 * Cost Trend Chart Component
 * Multi-provider cost analysis chart using Recharts
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface CostTrendChartProps {
  data?: Array<{
    date: string;
    aws: number;
    azure: number;
    gcp: number;
  }>;
  className?: string;
}

const defaultData = [
  { date: 'Jan 1', aws: 4200, azure: 3100, gcp: 2100 },
  { date: 'Jan 8', aws: 4400, azure: 3300, gcp: 2200 },
  { date: 'Jan 15', aws: 4100, azure: 3400, gcp: 2400 },
  { date: 'Jan 22', aws: 4600, azure: 3200, gcp: 2300 },
  { date: 'Jan 29', aws: 4800, azure: 3600, gcp: 2500 },
  { date: 'Feb 5', aws: 4500, azure: 3500, gcp: 2600 },
  { date: 'Feb 12', aws: 4900, azure: 3700, gcp: 2400 },
];

export function CostTrendChart({ data = defaultData, className }: CostTrendChartProps) {
  return (
    <div className={cn('w-full h-80', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis
            dataKey="date"
            className="text-xs text-slate-600 dark:text-slate-400"
            stroke="currentColor"
          />
          <YAxis
            className="text-xs text-slate-600 dark:text-slate-400"
            stroke="currentColor"
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="aws"
            stroke="#FF9900"
            strokeWidth={2}
            dot={{ fill: '#FF9900', r: 4 }}
            activeDot={{ r: 6 }}
            name="AWS"
          />
          <Line
            type="monotone"
            dataKey="azure"
            stroke="#0078d4"
            strokeWidth={2}
            dot={{ fill: '#0078d4', r: 4 }}
            activeDot={{ r: 6 }}
            name="Azure"
          />
          <Line
            type="monotone"
            dataKey="gcp"
            stroke="#34A853"
            strokeWidth={2}
            dot={{ fill: '#34A853', r: 4 }}
            activeDot={{ r: 6 }}
            name="GCP"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
