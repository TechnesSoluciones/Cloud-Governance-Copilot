'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { UserProfileForm } from '@/components/settings/UserProfileForm';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { userApi, User } from '@/lib/api/user';
import { ApiError } from '@/lib/api/client';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PREMIUM_GRADIENTS,
} from '@/components/shared/premium';

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (status === 'unauthenticated') {
        router.push('/login');
        return;
      }

      if (!session?.accessToken) {
        return;
      }

      try {
        const response = await userApi.getProfile(session.accessToken as string);
        if (response.data) {
          setUser(response.data);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.statusCode === 401) {
            router.push('/login');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load profile. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== 'loading') {
      fetchProfile();
    }
  }, [session, status, router]);

  const handleSaveProfile = async (updateData: any) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await userApi.updateProfile(updateData, session.accessToken as string);
    if (response.data) {
      setUser(response.data);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Alert variant="error">
          <div className="space-y-2">
            <p className="font-semibold">Failed to load profile</p>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Alert variant="error">
          <p>Unable to load user profile. Please try refreshing the page.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-4xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Profile Settings"
          subtitle="Manage your account information and preferences"
        />

        {/* Email Verification Banner */}
        {!user.isEmailVerified && (
          <EmailVerificationBanner
            isVerified={user.isEmailVerified}
            accessToken={session?.accessToken as string}
          />
        )}

        {/* Profile Form */}
        <UserProfileForm user={user} onSave={handleSaveProfile} />

        {/* Additional Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-blue-900 mb-2">Account Information</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p>
              <strong>Account Status:</strong>{' '}
              {user.isEmailVerified ? 'Verified' : 'Pending Verification'}
            </p>
            <p>
              <strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <p>
              <strong>Last Updated:</strong> {new Date(user.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
