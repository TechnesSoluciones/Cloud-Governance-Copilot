/**
 * Sidebar V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Responsive (hidden on mobile, visible on md+)
 * - Navigation with active states
 * - User profile section
 * - Feature flag controlled
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

interface SidebarV2Props {
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: 'dashboard',
  },
  {
    label: 'Cost Analysis',
    href: '/costs',
    icon: 'attach_money',
  },
  {
    label: 'Security',
    href: '/security',
    icon: 'security',
  },
  {
    label: 'Resources',
    href: '/resources',
    icon: 'dns',
  },
  {
    label: 'Recommendations',
    href: '/recommendations',
    icon: 'lightbulb',
  },
  {
    label: 'Incidents',
    href: '/incidents',
    icon: 'warning',
  },
  {
    label: 'Assets',
    href: '/assets',
    icon: 'inventory_2',
  },
  {
    label: 'Azure Advisor',
    href: '/azure-advisor',
    icon: 'psychology',
  },
  {
    label: 'Cloud Accounts',
    href: '/cloud-accounts',
    icon: 'cloud',
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: 'list_alt',
  },
];

const systemItems: NavigationItem[] = [
  {
    label: 'Settings',
    href: '/settings/profile',
    icon: 'settings',
  },
];

export function SidebarV2({ className }: SidebarV2Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Extract user information from session
  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'w-64 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-slate-800',
        'flex flex-col shrink-0 transition-all duration-300 z-20',
        'hidden md:flex', // Hidden on mobile, visible on md+
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="material-symbols-outlined text-3xl text-brand-primary-400">
          cloud_queue
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            CloudNexus
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Cloud Admin
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {navigationItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                active
                  ? 'bg-brand-primary-400/10 text-brand-primary-400 border-l-4 border-brand-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <span className={cn('material-symbols-outlined', active && 'icon-filled')}>
                {item.icon}
              </span>
              <span className={cn('text-sm', active ? 'font-semibold' : 'font-medium')}>
                {item.label}
              </span>
              {item.badge && (
                <span className="ml-auto bg-brand-primary-400 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* System Section Divider */}
        <div className="my-4 border-t border-slate-100 dark:border-slate-800/50 mx-3" />

        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          SYSTEM
        </p>

        {systemItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                active
                  ? 'bg-brand-primary-400/10 text-brand-primary-400 border-l-4 border-brand-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <span className={cn('material-symbols-outlined', active && 'icon-filled')}>{item.icon}</span>
              <span className={cn('text-sm', active ? 'font-semibold' : 'font-medium')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary-400 to-brand-primary-600 flex items-center justify-center text-white font-semibold">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {userEmail}
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
