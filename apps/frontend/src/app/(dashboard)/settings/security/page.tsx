/**
 * Security Settings V2 Page
 * CloudNexus Design - Security & Authentication Settings
 */

'use client';

import { useState } from 'react';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { StatusIndicatorV2 } from '@/components/ui/StatusIndicatorV2';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  permissions: string[];
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActivity: string;
  current: boolean;
}

export default function SecuritySettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'sk_prod_xxxxxxxxxxxxxxxx',
      created: '2024-01-15',
      lastUsed: '2024-12-26T10:30:00Z',
      permissions: ['read', 'write'],
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'sk_dev_xxxxxxxxxxxxxxxx',
      created: '2024-02-20',
      lastUsed: '2024-12-25T15:20:00Z',
      permissions: ['read'],
    },
  ]);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    {
      id: '1',
      device: 'Chrome on MacBook Pro',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      lastActivity: '2024-12-26T10:30:00Z',
      current: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone 15',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.101',
      lastActivity: '2024-12-26T08:15:00Z',
      current: false,
    },
    {
      id: '3',
      device: 'Firefox on Ubuntu',
      location: 'New York, NY',
      ipAddress: '10.0.0.50',
      lastActivity: '2024-12-25T22:45:00Z',
      current: false,
    },
  ]);

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    alert('Password changed successfully!');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleEnable2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    alert(twoFactorEnabled ? '2FA disabled' : '2FA setup wizard would appear here');
  };

  const handleCreateApiKey = () => {
    setShowApiKeyModal(true);
    // In real implementation, show modal for API key creation
    alert('API Key creation modal would appear here');
  };

  const handleRevokeApiKey = (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key?')) {
      setApiKeys(apiKeys.filter((key) => key.id !== keyId));
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    if (confirm('Are you sure you want to revoke this session?')) {
      setActiveSessions(activeSessions.filter((session) => session.id !== sessionId));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hr ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Security Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account security, authentication, and access controls
          </p>
        </div>

        {/* Security Overview */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Security Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  twoFactorEnabled ? 'bg-success/10' : 'bg-warning/10'
                )}
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-2xl',
                    twoFactorEnabled ? 'text-success' : 'text-warning'
                  )}
                >
                  {twoFactorEnabled ? 'verified_user' : 'shield'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Two-Factor Auth
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-blue-500">vpn_key</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">API Keys</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {apiKeys.length} active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-indigo-500">devices</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Active Sessions
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeSessions.length} devices
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Change Password
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Update your password regularly to maintain account security
          </p>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Must be at least 8 characters with uppercase, lowercase, numbers, and symbols
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <button
              onClick={handleChangePassword}
              className="px-6 py-2.5 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Two-Factor Authentication (2FA)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add an extra layer of security to your account by requiring a verification code in
                addition to your password
              </p>
            </div>
            {twoFactorEnabled && (
              <BadgeV2 variant="success" icon="check_circle">
                Enabled
              </BadgeV2>
            )}
          </div>

          {!twoFactorEnabled ? (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-warning text-xl">warning</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Two-factor authentication is disabled
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your account is more vulnerable without 2FA. Enable it now to improve security.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-success text-xl">
                  check_circle
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Two-factor authentication is active
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your account is protected with an additional layer of security.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleEnable2FA}
            className={cn(
              'px-6 py-2.5 rounded-lg font-semibold transition-colors',
              twoFactorEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-brand-primary-400 text-white hover:bg-brand-primary-500'
            )}
          >
            {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {/* API Keys */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                API Keys
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage API keys for programmatic access to your cloud infrastructure
              </p>
            </div>
            <button
              onClick={handleCreateApiKey}
              className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create API Key
            </button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-blue-500">vpn_key</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {apiKey.name}
                    </span>
                    <div className="flex gap-1">
                      {apiKey.permissions.map((perm) => (
                        <BadgeV2 key={perm} variant="default" size="sm">
                          {perm}
                        </BadgeV2>
                      ))}
                    </div>
                  </div>
                  <code className="text-xs bg-white dark:bg-slate-950 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                    {apiKey.key}
                  </code>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Created: {apiKey.created}</span>
                    <span>Last used: {formatTimestamp(apiKey.lastUsed)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeApiKey(apiKey.id)}
                  className="px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-medium hover:bg-error/20 transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>

          {apiKeys.length === 0 && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">
                vpn_key_off
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No API keys configured
              </p>
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Active Sessions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage devices and locations where you're currently signed in
            </p>
          </div>

          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg',
                  session.current
                    ? 'bg-brand-primary-400/5 border-2 border-brand-primary-400/20'
                    : 'bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-500 text-2xl">
                      {session.device.includes('MacBook') || session.device.includes('Ubuntu')
                        ? 'laptop_mac'
                        : 'smartphone'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {session.device}
                      </span>
                      {session.current && (
                        <BadgeV2 variant="success" size="sm">
                          Current Session
                        </BadgeV2>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">router</span>
                        {session.ipAddress}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Last activity: {formatTimestamp(session.lastActivity)}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button className="text-sm font-medium text-error hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign out from all other sessions
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-card-dark rounded-xl border-2 border-error/20 p-6">
          <h2 className="text-lg font-semibold text-error mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Irreversible and destructive actions
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">
                  Delete Account
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button className="px-4 py-2 bg-error text-white rounded-lg text-sm font-semibold hover:bg-error/90 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
