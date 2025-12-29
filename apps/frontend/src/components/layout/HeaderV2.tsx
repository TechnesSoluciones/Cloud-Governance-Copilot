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

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCloudProviderFilter, type CloudProvider } from '@/providers/CloudProviderFilterContext';

interface HeaderV2Props {
  className?: string;
}

export function HeaderV2({ className }: HeaderV2Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { selectedProvider, setSelectedProvider } = useCloudProviderFilter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock search results
  const searchResults = searchQuery.length > 0 ? [
    { id: 1, type: 'resource', title: 'EC2 Instance - prod-web-01', category: 'AWS Resources', path: '/resources' },
    { id: 2, type: 'policy', title: 'Security Group - sg-production', category: 'Policies', path: '/security' },
    { id: 3, type: 'recommendation', title: 'Optimize EBS volumes', category: 'Recommendations', path: '/recommendations' },
    { id: 4, type: 'account', title: 'Production AWS Account', category: 'Cloud Accounts', path: '/cloud-accounts' },
  ].filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show search results when typing
  useEffect(() => {
    if (searchQuery.length > 0) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  // Get user initials
  const user = session?.user as any;
  const userName = user?.fullName || user?.name || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const providers: Array<{ id: CloudProvider; label: string; color: string }> = [
    { id: 'all', label: 'ALL CLOUDS', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { id: 'aws', label: 'AWS', color: 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20' },
    { id: 'azure', label: 'AZURE', color: 'bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20' },
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
      <div ref={searchRef} className="flex-1 max-w-md hidden md:block relative">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search resources, policies, or recommendations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
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

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-card-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
            <div className="p-2 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    router.push(result.path);
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-brand-primary-400 text-2xl mt-0.5">
                    {result.type === 'resource' ? 'dns' : result.type === 'policy' ? 'policy' : result.type === 'recommendation' ? 'lightbulb' : 'cloud'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{result.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{result.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {showSearchResults && searchQuery.length > 0 && searchResults.length === 0 && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-card-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">search_off</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">No results found for "{searchQuery}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-3">
        {/* Search Icon (Mobile Only) */}
        <button className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-xl">search</span>
        </button>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Mock notifications */}
                {[
                  { id: 1, title: 'New security finding', message: 'Critical vulnerability detected in production', time: '5 min ago', type: 'error' },
                  { id: 2, title: 'Cost alert', message: 'Monthly budget exceeded by 15%', time: '1 hour ago', type: 'warning' },
                  { id: 3, title: 'Recommendation applied', message: 'Successfully optimized 3 resources', time: '2 hours ago', type: 'success' },
                ].map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "material-symbols-outlined text-2xl",
                        notification.type === 'error' && 'text-error',
                        notification.type === 'warning' && 'text-warning',
                        notification.type === 'success' && 'text-success'
                      )}>
                        {notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : 'check_circle'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{notification.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                <button className="w-full text-sm text-brand-primary-400 hover:text-brand-primary-500 font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => router.push('/settings/profile')}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          title="Settings"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="material-symbols-outlined text-xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* User Menu (Desktop Only) */}
        <div ref={userMenuRef} className="relative hidden md:block">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary-400 to-brand-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {userInitials}
            </div>
            <span className="material-symbols-outlined text-xl">expand_more</span>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              {/* User Info */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary-400 to-brand-primary-600 flex items-center justify-center text-white text-base font-semibold">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{userName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    router.push('/settings/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">person</span>
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/settings/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                  <span>Settings</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error hover:bg-error/5 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
