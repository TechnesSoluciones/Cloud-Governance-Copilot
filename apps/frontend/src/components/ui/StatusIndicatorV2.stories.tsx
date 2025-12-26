/**
 * Status Indicator V2 Stories
 * Storybook stories for StatusIndicatorV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusIndicatorV2 } from './StatusIndicatorV2';

const meta = {
  title: 'Components/UI/StatusIndicatorV2',
  component: StatusIndicatorV2,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['operational', 'degraded', 'warning', 'critical', 'maintenance'],
    },
  },
} satisfies Meta<typeof StatusIndicatorV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Operational status
export const Operational: Story = {
  args: {
    status: 'operational',
    label: 'All Systems Operational',
    details: 'All services running normally',
  },
};

// Degraded status
export const Degraded: Story = {
  args: {
    status: 'degraded',
    label: 'Performance Degraded',
    details: 'Some services experiencing high latency',
  },
};

// Warning status
export const Warning: Story = {
  args: {
    status: 'warning',
    label: 'Resource Usage Warning',
    details: 'CPU usage at 85% - consider scaling',
  },
};

// Critical status
export const Critical: Story = {
  args: {
    status: 'critical',
    label: 'Service Outage',
    details: 'Database connection failed',
  },
};

// Maintenance status
export const Maintenance: Story = {
  args: {
    status: 'maintenance',
    label: 'Scheduled Maintenance',
    details: 'System update in progress',
  },
};

// With custom icon
export const WithIcon: Story = {
  args: {
    status: 'operational',
    label: 'AWS US-East-1',
    details: 'All services healthy',
    icon: 'cloud_done',
  },
};

// Service health example
export const ServiceHealthList: Story = {
  args: {
    status: 'operational',
    label: 'Service Status',
  },
  render: () => (
    <div className="space-y-3 max-w-md">
      <StatusIndicatorV2
        status="operational"
        label="AWS US-East-1"
        details="EC2, RDS, S3 - All operational"
        icon="cloud_done"
      />
      <StatusIndicatorV2
        status="operational"
        label="Azure West Europe"
        details="VMs, Storage, Database - All operational"
        icon="cloud_done"
      />
      <StatusIndicatorV2
        status="warning"
        label="GCP Asia-East"
        details="High traffic detected"
        icon="cloud_sync"
      />
      <StatusIndicatorV2
        status="critical"
        label="AWS EU-Central"
        details="Network connectivity issues"
        icon="cloud_off"
      />
    </div>
  ),
};

// All statuses
export const AllStatuses: Story = {
  args: {
    status: 'operational',
    label: 'Status',
  },
  render: () => (
    <div className="space-y-4 max-w-md">
      <StatusIndicatorV2
        status="operational"
        label="Operational"
        details="Everything is working fine"
      />
      <StatusIndicatorV2
        status="degraded"
        label="Degraded"
        details="Performance issues detected"
      />
      <StatusIndicatorV2 status="warning" label="Warning" details="Resource threshold reached" />
      <StatusIndicatorV2
        status="critical"
        label="Critical"
        details="Service is down"
      />
      <StatusIndicatorV2
        status="maintenance"
        label="Maintenance"
        details="Scheduled downtime"
      />
    </div>
  ),
};
