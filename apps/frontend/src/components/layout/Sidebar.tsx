'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { Icons } from '@/components/icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Icons.home className="h-5 w-5" />,
  },
  {
    label: 'Costs',
    href: '/costs',
    icon: <Icons.dollarSign className="h-5 w-5" />,
  },
  {
    label: 'Security',
    href: '/security',
    icon: <Icons.shield className="h-5 w-5" />,
  },
  {
    label: 'Resources',
    href: '/resources',
    icon: <Icons.server className="h-5 w-5" />,
  },
  {
    label: 'Recommendations',
    href: '/recommendations',
    icon: <Icons.trendingUp className="h-5 w-5" />,
  },
  {
    label: 'Incidents',
    href: '/incidents',
    icon: <Icons.alertTriangle className="h-5 w-5" />,
  },
  {
    label: 'Assets',
    href: '/assets',
    icon: <Icons.package className="h-5 w-5" />,
  },
  {
    label: 'Azure Advisor',
    href: '/azure-advisor',
    icon: <Icons.cloud className="h-5 w-5" />,
  },
  {
    label: 'Cloud Accounts',
    href: '/cloud-accounts',
    icon: <Icons.cloud className="h-5 w-5" />,
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: <Icons.activity className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/settings/profile',
    icon: <Icons.settings className="h-5 w-5" />,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            {/* Decorative cloud icon: hidden from screen readers */}
            <Icons.cloud className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-lg font-bold">Cloud Copilot</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Decorative icon: hidden from screen readers, text label provides context */}
                  <span aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar fallback={userInitials} size="md" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
