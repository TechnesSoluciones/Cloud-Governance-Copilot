/**
 * Header V2 Stories
 * Storybook stories for HeaderV2 component
 */

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HeaderV2 } from './HeaderV2';

const meta = {
  title: 'Components/Layout/HeaderV2',
  component: HeaderV2,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HeaderV2>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default header
export const Default: Story = {
  render: () => (
    <div>
      <HeaderV2 />
      <div className="p-8 bg-bg-light dark:bg-bg-dark">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Main Content</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          This is the main content area. The header is at the top.
        </p>
      </div>
    </div>
  ),
};
