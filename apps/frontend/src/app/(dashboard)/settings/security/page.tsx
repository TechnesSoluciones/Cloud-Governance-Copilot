'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { MFASetupWizard } from '@/components/auth/MFASetupWizard';
import { userApi, User } from '@/lib/api/user';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { changePasswordSchema, ChangePasswordInput, mfaDisableSchema } from '@/lib/validation/auth';

export default function SecuritySettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Password change state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof ChangePasswordInput, string>>>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // MFA state
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showMFADisable, setShowMFADisable] = useState(false);
  const [disableMFAPassword, setDisableMFAPassword] = useState('');
  const [disableMFAToken, setDisableMFAToken] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

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
        if (err instanceof ApiError && err.statusCode === 401) {
          router.push('/login');
        } else {
          setError('Failed to load security settings. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== 'loading') {
      fetchProfile();
    }
  }, [session, status, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSuccess(false);

    // Validate form
    const result = changePasswordSchema.safeParse(passwordForm);
    if (!result.success) {
      const errors: Partial<Record<keyof ChangePasswordInput, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ChangePasswordInput;
        errors[field] = err.message;
      });
      setPasswordErrors(errors);
      return;
    }

    if (!session?.accessToken) {
      setPasswordErrors({ currentPassword: 'Not authenticated' });
      return;
    }

    setPasswordLoading(true);

    try {
      await userApi.changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        session.accessToken as string
      );

      setPasswordSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordErrors({ currentPassword: err.message });
      } else {
        setPasswordErrors({ currentPassword: 'Failed to change password. Please try again.' });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMFASetupComplete = async () => {
    setShowMFASetup(false);
    // Refresh user data
    if (session?.accessToken) {
      const response = await userApi.getProfile(session.accessToken as string);
      if (response.data) {
        setUser(response.data);
      }
    }
    // Update session
    await update();
  };

  const handleDisableMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');

    // Validate
    const result = mfaDisableSchema.safeParse({
      password: disableMFAPassword,
      token: disableMFAToken,
    });

    if (!result.success) {
      setMfaError(result.error.errors[0].message);
      return;
    }

    if (!session?.accessToken) {
      setMfaError('Not authenticated');
      return;
    }

    setMfaLoading(true);

    try {
      await authApi.disableMFA(
        disableMFAPassword,
        disableMFAToken,
        session.accessToken as string
      );

      setShowMFADisable(false);
      setDisableMFAPassword('');
      setDisableMFAToken('');

      // Refresh user data
      const response = await userApi.getProfile(session.accessToken as string);
      if (response.data) {
        setUser(response.data);
      }

      // Update session
      await update();
    } catch (err) {
      if (err instanceof ApiError) {
        setMfaError(err.message);
      } else {
        setMfaError('Failed to disable MFA. Please try again.');
      }
    } finally {
      setMfaLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Alert variant="error">
          <p>Unable to load security settings. Please try refreshing the page.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your password and two-factor authentication
          </p>
        </div>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordSuccess && (
                <Alert variant="success">Password changed successfully!</Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword" required>
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                    setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                  }}
                  disabled={passwordLoading}
                  className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-500">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" required>
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                  }}
                  disabled={passwordLoading}
                  className={passwordErrors.newPassword ? 'border-red-500' : ''}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500">{passwordErrors.newPassword}</p>
                )}
                <p className="text-xs text-gray-600">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" required>
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                    setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                  }}
                  disabled={passwordLoading}
                  className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {user.isMFAEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${
                    user.isMFAEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user.isMFAEnabled && !showMFASetup && (
              <>
                <p className="text-sm text-gray-700">
                  Two-factor authentication is currently disabled. Enable it to add an extra layer
                  of security to your account.
                </p>
                <Button onClick={() => setShowMFASetup(true)}>Enable 2FA</Button>
              </>
            )}

            {showMFASetup && (
              <MFASetupWizard
                isEnabled={user.isMFAEnabled}
                accessToken={session?.accessToken as string}
                onComplete={handleMFASetupComplete}
              />
            )}

            {user.isMFAEnabled && !showMFADisable && (
              <>
                <Alert variant="success">
                  <div className="space-y-2">
                    <p className="font-semibold">Two-factor authentication is enabled</p>
                    <p className="text-sm">
                      Your account is protected with two-factor authentication. You'll need to
                      enter a code from your authenticator app when you sign in.
                    </p>
                  </div>
                </Alert>
                <Button variant="outline" onClick={() => setShowMFADisable(true)}>
                  Disable 2FA
                </Button>
              </>
            )}

            {showMFADisable && (
              <form onSubmit={handleDisableMFA} className="space-y-4">
                {mfaError && <Alert variant="error">{mfaError}</Alert>}

                <Alert variant="warning">
                  <p className="font-semibold">Disable Two-Factor Authentication</p>
                  <p className="text-sm mt-1">
                    This will make your account less secure. Enter your password and a
                    verification code to confirm.
                  </p>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="mfaPassword" required>
                    Password
                  </Label>
                  <Input
                    id="mfaPassword"
                    type="password"
                    value={disableMFAPassword}
                    onChange={(e) => {
                      setDisableMFAPassword(e.target.value);
                      setMfaError('');
                    }}
                    disabled={mfaLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mfaToken" required>
                    Verification Code
                  </Label>
                  <Input
                    id="mfaToken"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={disableMFAToken}
                    onChange={(e) => {
                      setDisableMFAToken(e.target.value.replace(/\D/g, ''));
                      setMfaError('');
                    }}
                    disabled={mfaLoading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowMFADisable(false);
                      setDisableMFAPassword('');
                      setDisableMFAToken('');
                      setMfaError('');
                    }}
                    disabled={mfaLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mfaLoading}>
                    {mfaLoading ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions Card (TODO) */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Manage your active login sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="info">
              <p className="text-sm">
                Active session management will be available in a future update.
              </p>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
