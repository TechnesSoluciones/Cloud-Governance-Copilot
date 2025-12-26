/**
 * Header V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Cloud provider filters (AWS, Azure, GCP)
 * - Global search
 * - Notifications with badge
 * - Settings and user menu
 * - Responsive design
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface HeaderV2Props {
  className?: string;
}

type CloudProvider = 'all' | 'aws' | 'azure' | 'gcp';

export function HeaderV2({ className }: HeaderV2Props) {
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount] = useState(3);

  const providers: Array<{ id: CloudProvider; label: string; color: string }> = [
    { id: 'all', label: 'All Clouds', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { id: 'aws', label: 'AWS', color: 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20' },
    { id: 'azure', label: 'Azure', color: 'bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20' },
    { id: 'gcp', label: 'GCP', color: 'bg-[#34A853]/10 text-[#34A853] border border-[#34A853]/20' },
  ];

  return (
    <header
      className={cn(
        'h-16 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800',
        'flex items-center justify-between px-6 gap-4',
        'sticky top-0 z-10',
        className
      )}
    >
      {/* Left Section: Cloud Provider Filters */}
      <div className="flex items-center gap-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setSelectedProvider(provider.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              selectedProvider === provider.id
                ? provider.color + ' shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            {provider.label}
          </button>
        ))}
      </div>

      {/* Center Section: Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search resources, policies, or recommendations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg',
              'bg-slate-50 dark:bg-slate-800/50',
              'border border-slate-200 dark:border-slate-700',
              'text-sm text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-500 dark:placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary-400/50 focus:border-brand-primary-400',
              'transition-all'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        {/* Search Icon (Mobile Only) */}
        <button className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-xl">search</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-xl">notifications</span>
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
          )}
        </button>

        {/* Settings */}
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        {/* Dark Mode Toggle */}
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-xl">dark_mode</span>
        </button>

        {/* User Menu (Desktop Only) */}
        <button className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary-400 to-brand-primary-600 flex items-center justify-center text-white text-sm font-semibold">
            JD
          </div>
          <span className="material-symbols-outlined text-xl">expand_more</span>
        </button>
      </div>
    </header>
  );
}
