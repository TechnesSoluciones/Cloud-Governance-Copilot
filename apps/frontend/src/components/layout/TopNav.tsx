'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';

interface TopNavProps {
  onMenuClick: () => void;
  breadcrumbs?: { label: string; href?: string }[];
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick, breadcrumbs = [] }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation menu"
      >
        {/* Decorative menu icon: hidden from screen readers, aria-label provides accessible name */}
        <Icons.menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="hidden sm:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                /* Decorative chevron separator: hidden from screen readers */
                <Icons.chevronRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search placeholder */}
      <div className="hidden md:flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground w-64" role="search">
        {/* Decorative search icon: hidden from screen readers */}
        <Icons.search className="h-4 w-4" aria-hidden="true" />
        <span>Search...</span>
        <kbd className="ml-auto text-xs">⌘K</kbd>
      </div>

      {/* Notifications placeholder */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        aria-label="Notifications"
        aria-describedby="notification-badge"
      >
        {/* Decorative bell icon: hidden from screen readers, aria-label provides accessible name */}
        <Icons.bell className="h-5 w-5" aria-hidden="true" />
        {/* Notification badge indicator */}
        <span
          className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"
          id="notification-badge"
          aria-hidden="true"
        />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors"
            aria-label="User menu"
          >
            <Avatar fallback={userInitials} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
            <Icons.user className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings/security')}>
            <Icons.settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <Icons.logout className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
