'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default function VerifyEmailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    if (!session?.accessToken) {
      setError('You must be logged in to resend verification email.');
      return;
    }

    setIsResending(true);
    setError('');
    setIsSuccess(false);

    try {
      await authApi.resendVerification(session.accessToken as string);
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError('Too many requests. Please wait a few minutes before trying again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-12 w-12 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            Please check your inbox for a verification link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess && (
            <Alert variant="success">
              <div className="space-y-2">
                <p className="font-semibold">Verification email sent!</p>
                <p className="text-sm">
                  Please check your inbox and spam folder. The email should arrive within a few
                  minutes.
                </p>
              </div>
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {!isSuccess && (
            <Alert variant="info">
              <div className="space-y-2">
                <p className="font-semibold">Email verification required</p>
                <p className="text-sm">
                  We've sent a verification link to your email address. Please click the link to
                  verify your account.
                </p>
              </div>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">What to do next:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Check your email inbox for a message from Cloud Governance Copilot</li>
              <li>Click the verification link in the email</li>
              <li>You'll be redirected to your dashboard once verified</li>
            </ol>
          </div>

          <div className="space-y-3 pt-4">
            <p className="text-sm text-gray-700">Didn't receive the email?</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>

            <Button
              onClick={handleResendEmail}
              disabled={isResending || !session}
              className="w-full"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            {!session && (
              <p className="text-sm text-center text-yellow-600">
                Please log in to resend verification email
              </p>
            )}
          </div>

          <div className="pt-4 space-y-2">
            {session ? (
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
