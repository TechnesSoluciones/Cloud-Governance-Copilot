/**
 * Sidebar V2 Stories
 * Storybook stories for SidebarV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarV2 } from './SidebarV2';

const meta = {
  title: 'Components/Layout/SidebarV2',
  component: SidebarV2,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SidebarV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default sidebar
export const Default: Story = {
  render: () => (
    <div className="flex h-screen">
      <SidebarV2 />
      <div className="flex-1 p-8 bg-bg-light dark:bg-bg-dark">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Main Content</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          This is the main content area. The sidebar is on the left.
        </p>
      </div>
    </div>
  ),
};
