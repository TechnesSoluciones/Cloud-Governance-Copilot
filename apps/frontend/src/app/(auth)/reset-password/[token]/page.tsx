'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Basic token validation (check if token exists and has reasonable length)
    if (!token || token.length < 20) {
      setValidationError('Invalid or missing reset token.');
      setIsValidating(false);
      return;
    }

    // Token appears valid
    setIsValidToken(true);
    setIsValidating(false);
  }, [token]);

  const handleSuccess = () => {
    // Redirect to login after successful password reset
    setTimeout(() => {
      router.push('/login?reset=success');
    }, 2000);
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600">Validating reset token...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError || !isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">Invalid Link</CardTitle>
            <CardDescription className="text-center">
              This password reset link is not valid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="error">
              <div className="space-y-2">
                <p className="font-semibold">Unable to reset password</p>
                <p className="text-sm">
                  {validationError || 'The password reset link is invalid or has expired.'}
                </p>
              </div>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-gray-700">This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>The link has expired (links are valid for 1 hour)</li>
                <li>The link has already been used</li>
                <li>You copied the link incorrectly</li>
              </ul>

              <div className="pt-4 space-y-2">
                <Link
                  href="/forgot-password"
                  className="block w-full text-center px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
                >
                  Request New Reset Link
                </Link>
                <Link
                  href="/login"
                  className="block w-full text-center px-4 py-2 text-primary hover:underline"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetForm token={token} onSuccess={handleSuccess} />
        </CardContent>
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">Remember your password?</span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
