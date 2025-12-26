/**
 * Dashboard Layout V2 Stories
 * Storybook stories for DashboardLayoutV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DashboardLayoutV2 } from './DashboardLayoutV2';
import { KPICardV2 } from '../ui/KPICardV2';

const meta = {
  title: 'Components/Layout/DashboardLayoutV2',
  component: DashboardLayoutV2,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardLayoutV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default layout with empty content
export const Default: Story = {
  args: {
    children: (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">Welcome to your dashboard</p>
      </div>
    ),
  },
};

// With KPI Cards
export const WithKPICards: Story = {
  args: {
    children: (
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Cloud Overview
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor your multi-cloud infrastructure
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardV2
            icon="attach_money"
            label="Total Monthly Cost"
            value="$12,450"
            variant="blue"
            trend={{
              direction: 'up',
              percentage: 12,
              label: 'vs last month',
            }}
          />
          <KPICardV2
            icon="security"
            label="Security Score"
            value="85/100"
            variant="emerald"
            comparison="Good security posture"
          />
          <KPICardV2
            icon="dns"
            label="Active Resources"
            value="1,240"
            variant="indigo"
            trend={{
              direction: 'down',
              percentage: 3,
            }}
          />
          <KPICardV2
            icon="warning"
            label="Critical Alerts"
            value="3"
            variant="red"
            trend={{
              direction: 'up',
              percentage: 50,
            }}
          />
        </div>

        {/* Additional Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Cost Analysis
            </h3>
            <p className="text-slate-600 dark:text-slate-400">Chart placeholder</p>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Security Health
            </h3>
            <p className="text-slate-600 dark:text-slate-400">Chart placeholder</p>
          </div>
        </div>
      </div>
    ),
  },
};
