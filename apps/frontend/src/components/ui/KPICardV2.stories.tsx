/**
 * KPI Card V2 Stories
 * Storybook stories for KPICardV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KPICardV2 } from './KPICardV2';

const meta = {
  title: 'Components/UI/KPICardV2',
  component: KPICardV2,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['blue', 'emerald', 'indigo', 'orange', 'red', 'purple'],
    },
  },
} satisfies Meta<typeof KPICardV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    icon: 'attach_money',
    label: 'Total Monthly Cost',
    value: '$12,450',
    variant: 'blue',
  },
};

// With trending up
export const WithTrendUp: Story = {
  args: {
    icon: 'attach_money',
    label: 'Total Monthly Cost',
    value: '$12,450',
    variant: 'emerald',
    trend: {
      direction: 'up',
      percentage: 12,
      label: 'vs last month',
    },
  },
};

// With trending down
export const WithTrendDown: Story = {
  args: {
    icon: 'attach_money',
    label: 'Total Monthly Cost',
    value: '$12,450',
    variant: 'red',
    trend: {
      direction: 'down',
      percentage: 8,
      label: 'vs last month',
    },
  },
};

// With comparison
export const WithComparison: Story = {
  args: {
    icon: 'security',
    label: 'Security Score',
    value: '85/100',
    variant: 'indigo',
    comparison: 'Good security posture',
  },
};

// With progress bar
export const WithProgressBar: Story = {
  args: {
    icon: 'dns',
    label: 'Active Resources',
    value: '1,240',
    variant: 'purple',
    progress: {
      current: 1240,
      max: 2000,
      label: 'Resource limit',
    },
  },
};

// Critical alerts (red)
export const CriticalAlerts: Story = {
  args: {
    icon: 'warning',
    label: 'Critical Alerts',
    value: '3',
    variant: 'red',
    trend: {
      direction: 'up',
      percentage: 50,
    },
  },
};

// All variants showcase
export const AllVariants: Story = {
  args: {
    icon: 'attach_money',
    label: 'Total Cost',
    value: '$12,450',
    variant: 'blue',
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <KPICardV2
        icon="attach_money"
        label="Blue Variant"
        value="$12,450"
        variant="blue"
        trend={{ direction: 'up', percentage: 12 }}
      />
      <KPICardV2
        icon="security"
        label="Emerald Variant"
        value="85/100"
        variant="emerald"
        trend={{ direction: 'up', percentage: 5 }}
      />
      <KPICardV2
        icon="dns"
        label="Indigo Variant"
        value="1,240"
        variant="indigo"
        trend={{ direction: 'down', percentage: 3 }}
      />
      <KPICardV2
        icon="warning"
        label="Orange Variant"
        value="12"
        variant="orange"
        trend={{ direction: 'up', percentage: 8 }}
      />
      <KPICardV2
        icon="error"
        label="Red Variant"
        value="3"
        variant="red"
        trend={{ direction: 'down', percentage: 25 }}
      />
      <KPICardV2
        icon="analytics"
        label="Purple Variant"
        value="98.5%"
        variant="purple"
        trend={{ direction: 'up', percentage: 2 }}
      />
    </div>
  ),
};
