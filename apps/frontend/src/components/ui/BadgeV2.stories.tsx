/**
 * Badge V2 Stories
 * Storybook stories for BadgeV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BadgeV2 } from './BadgeV2';

const meta = {
  title: 'Components/UI/BadgeV2',
  component: BadgeV2,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'success',
        'warning',
        'error',
        'info',
        'critical',
        'high',
        'medium',
        'low',
        'aws',
        'azure',
        'gcp',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof BadgeV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default badge
export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

// Primary badge
export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

// Status badges
export const StatusBadges: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <BadgeV2 variant="success">Success</BadgeV2>
      <BadgeV2 variant="warning">Warning</BadgeV2>
      <BadgeV2 variant="error">Error</BadgeV2>
      <BadgeV2 variant="info">Info</BadgeV2>
    </div>
  ),
};

// Severity badges
export const SeverityBadges: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <BadgeV2 variant="critical" icon="error">
        Critical
      </BadgeV2>
      <BadgeV2 variant="high" icon="warning">
        High
      </BadgeV2>
      <BadgeV2 variant="medium" icon="info">
        Medium
      </BadgeV2>
      <BadgeV2 variant="low">Low</BadgeV2>
    </div>
  ),
};

// Cloud provider badges
export const CloudProviderBadges: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <BadgeV2 variant="aws" icon="cloud">
        AWS
      </BadgeV2>
      <BadgeV2 variant="azure" icon="cloud">
        Azure
      </BadgeV2>
      <BadgeV2 variant="gcp" icon="cloud">
        GCP
      </BadgeV2>
    </div>
  ),
};

// Different sizes
export const Sizes: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <BadgeV2 size="sm" variant="primary">
        Small
      </BadgeV2>
      <BadgeV2 size="md" variant="primary">
        Medium
      </BadgeV2>
      <BadgeV2 size="lg" variant="primary">
        Large
      </BadgeV2>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <BadgeV2 variant="success" icon="check_circle">
        Verified
      </BadgeV2>
      <BadgeV2 variant="warning" icon="warning">
        Warning
      </BadgeV2>
      <BadgeV2 variant="error" icon="error">
        Error
      </BadgeV2>
      <BadgeV2 variant="info" icon="info">
        Info
      </BadgeV2>
    </div>
  ),
};

// All variants
export const AllVariants: Story = {
  args: { children: 'Badge' },
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Basic Variants</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="default">Default</BadgeV2>
          <BadgeV2 variant="primary">Primary</BadgeV2>
          <BadgeV2 variant="success">Success</BadgeV2>
          <BadgeV2 variant="warning">Warning</BadgeV2>
          <BadgeV2 variant="error">Error</BadgeV2>
          <BadgeV2 variant="info">Info</BadgeV2>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Severity Variants</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="critical">Critical</BadgeV2>
          <BadgeV2 variant="high">High</BadgeV2>
          <BadgeV2 variant="medium">Medium</BadgeV2>
          <BadgeV2 variant="low">Low</BadgeV2>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Cloud Provider Variants</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeV2 variant="aws">AWS</BadgeV2>
          <BadgeV2 variant="azure">Azure</BadgeV2>
          <BadgeV2 variant="gcp">GCP</BadgeV2>
        </div>
      </div>
    </div>
  ),
};
