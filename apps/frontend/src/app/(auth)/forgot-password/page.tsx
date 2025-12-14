'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validation/auth';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setIsSuccess(true);

      // Set cooldown timer (60 seconds)
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle rate limit error
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError(
            'Too many password reset requests. Please wait a few minutes and try again.'
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>

        {isSuccess ? (
          <CardContent className="space-y-4">
            <Alert variant="success">
              <div className="space-y-2">
                <p className="font-semibold">Check your email!</p>
                <p className="text-sm">
                  If an account exists with <strong>{email}</strong>, you will receive a password
                  reset link shortly.
                </p>
                <p className="text-sm">The link will expire in 1 hour.</p>
              </div>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm text-gray-700">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>
                  Wait a few minutes for the email to arrive
                  {cooldown > 0 && ` (${cooldown}s)`}
                </li>
              </ul>

              {cooldown === 0 && (
                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try Another Email
                </Button>
              )}
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}

              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="flex items-center justify-center gap-1 text-sm">
                <span className="text-muted-foreground">Remember your password?</span>
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Back to Login
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
