'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export interface EmailVerificationBannerProps {
  isVerified?: boolean;
  accessToken?: string;
  onResend?: () => void;
}

export function EmailVerificationBanner({
  isVerified: isVerifiedProp,
  accessToken: accessTokenProp,
  onResend,
}: EmailVerificationBannerProps = {}) {
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  // Use props or derive from session
  const isVerified = isVerifiedProp ?? (session?.user as any)?.emailVerified ?? true;
  const accessToken = accessTokenProp ?? (session as any)?.accessToken;

  // Don't show banner if email is verified, has been dismissed, or user is not logged in
  if (isVerified || isDismissed || !session) {
    return null;
  }

  const handleResend = async () => {
    if (!accessToken) {
      setResendError('You must be logged in to resend verification email');
      return;
    }

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await authApi.resendVerification(accessToken);
      setResendSuccess(true);
      if (onResend) {
        onResend();
      }
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      if (error instanceof ApiError) {
        setResendError(error.message);
      } else {
        setResendError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (resendSuccess) {
    return (
      <Alert variant="success" dismissible onDismiss={handleDismiss}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Verification email sent!</p>
            <p className="mt-1 text-sm">
              Please check your inbox and follow the link to verify your email address.
            </p>
          </div>
        </div>
      </Alert>
    );
  }

  return (
    <Alert variant="warning" dismissible onDismiss={handleDismiss}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold">Email verification required</p>
          <p className="mt-1 text-sm">
            Please verify your email address to access all features. Check your inbox for the
            verification link.
          </p>
          {resendError && <p className="mt-2 text-sm text-red-600">{resendError}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={isResending}
          className="shrink-0 bg-white hover:bg-gray-50"
        >
          {isResending ? 'Sending...' : 'Resend Email'}
        </Button>
      </div>
    </Alert>
  );
}
