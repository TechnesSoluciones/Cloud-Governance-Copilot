/**
 * Profile Settings V2 Page
 * CloudNexus Design - User Profile Management
 */

'use client';

import { useState } from 'react';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { cn } from '@/lib/utils';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  company: string;
  timezone: string;
  language: string;
  phoneNumber: string;
  avatar?: string;
  notifications: {
    emailAlerts: boolean;
    slackAlerts: boolean;
    smsAlerts: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    securityAlerts: boolean;
    costAlerts: boolean;
    incidentAlerts: boolean;
  };
}

export default function ProfileSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    jobTitle: 'Cloud Infrastructure Engineer',
    company: 'Acme Corporation',
    timezone: 'America/New_York',
    language: 'en-US',
    phoneNumber: '+1 (555) 123-4567',
    notifications: {
      emailAlerts: true,
      slackAlerts: true,
      smsAlerts: false,
      weeklyReports: true,
      monthlyReports: true,
      securityAlerts: true,
      costAlerts: true,
      incidentAlerts: true,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert('Profile updated successfully!');
    }, 1500);
  };

  const handleAvatarUpload = () => {
    // Implement file upload logic
    alert('Avatar upload functionality');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Profile Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Avatar Section */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Profile Picture
          </h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-brand-primary-400 flex items-center justify-center text-white text-3xl font-bold">
              {profile.firstName[0]}
              {profile.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Upload a profile picture to personalize your account. Recommended size: 256x256px
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAvatarUpload}
                  className="px-4 py-2 bg-brand-primary-400 text-white rounded-lg text-sm font-semibold hover:bg-brand-primary-500 transition-colors"
                >
                  Upload Photo
                </button>
                <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phoneNumber}
                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={profile.jobTitle}
                onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Company
              </label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Timezone
              </label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Language
              </label>
              <select
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Notification Preferences
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Choose how you want to receive notifications about your cloud infrastructure
          </p>

          <div className="space-y-6">
            {/* Notification Channels */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Notification Channels
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500 text-2xl">
                      email
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Email Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.emailAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          emailAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-500 text-2xl">
                      chat
                    </span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Slack Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Get alerts in Slack channels
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.slackAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          slackAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500 text-2xl">sms</span>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">SMS Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Critical alerts via SMS
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notifications.smsAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          smsAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>
              </div>
            </div>

            {/* Alert Types */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Alert Types
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Security Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.notifications.securityAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          securityAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Cost Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.notifications.costAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          costAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Incident Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.notifications.incidentAlerts}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          incidentAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Weekly Reports
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.notifications.weeklyReports}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          weeklyReports: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:col-span-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Monthly Reports
                  </span>
                  <input
                    type="checkbox"
                    checked={profile.notifications.monthlyReports}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifications: {
                          ...profile.notifications,
                          monthlyReports: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 text-brand-primary-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-brand-primary-400"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
    </div>
  );
}
