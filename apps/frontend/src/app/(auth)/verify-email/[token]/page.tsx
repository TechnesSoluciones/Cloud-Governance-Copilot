'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default function VerifyEmailTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Verification token is missing.');
        setIsVerifying(false);
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setIsSuccess(true);

        // Start countdown for redirect
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              router.push('/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'TOKEN_EXPIRED') {
            setError('This verification link has expired. Please request a new one.');
          } else if (err.code === 'INVALID_TOKEN') {
            setError('This verification link is invalid or has already been used.');
          } else {
            setError(err.message);
          }
        } else {
          setError('An unexpected error occurred during verification.');
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Spinner size="lg" />
            <div className="text-center">
              <p className="font-semibold text-lg">Verifying your email...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center">Email Verified!</CardTitle>
            <CardDescription className="text-center">
              Your email address has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="success">
              <div className="space-y-2">
                <p className="font-semibold">Verification successful</p>
                <p className="text-sm">
                  Your account is now fully activated. You can now access all features of the
                  platform.
                </p>
              </div>
            </Alert>

            <div className="text-center text-sm text-gray-600">
              Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>

            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-12 w-12 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">Verification Failed</CardTitle>
          <CardDescription className="text-center">
            Unable to verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="error">
            <div className="space-y-2">
              <p className="font-semibold">Verification error</p>
              <p className="text-sm">{error}</p>
            </div>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-gray-700">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Request a new verification email from your dashboard</li>
              <li>Make sure you're using the latest verification link</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Link href="/verify-email">
              <Button className="w-full">Request New Verification Email</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
