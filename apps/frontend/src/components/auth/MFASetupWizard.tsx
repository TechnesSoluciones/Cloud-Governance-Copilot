'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { mfaVerificationSchema } from '@/lib/validation/auth';

export interface MFASetupWizardProps {
  isEnabled: boolean;
  accessToken: string;
  onComplete?: () => void;
}

type WizardStep = 'intro' | 'scan' | 'verify' | 'backup';

export function MFASetupWizard({ isEnabled, accessToken, onComplete }: MFASetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.setupMFA(accessToken);
      if (response.data) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setCurrentStep('scan');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to setup MFA. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    setTokenError('');

    // Validate token format
    const result = mfaVerificationSchema.safeParse({ token: verificationToken });
    if (!result.success) {
      setTokenError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      await authApi.verifyMFASetup(verificationToken, accessToken);

      // Generate backup codes
      const backupResponse = await authApi.generateBackupCodes(accessToken);
      if (backupResponse.data) {
        setBackupCodes(backupResponse.data.codes);
        setCurrentStep('backup');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setTokenError(err.message);
      } else {
        setTokenError('Invalid verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  };

  // Intro Step
  if (currentStep === 'intro') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Two-factor authentication (2FA) adds an additional security layer to your account.
              You'll need to enter a code from your authenticator app each time you log in.
            </p>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">What you'll need:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Your phone or device with the app installed</li>
                <li>A few minutes to complete the setup</li>
              </ul>
            </div>

            <div className="pt-4">
              <Button onClick={handleStartSetup} disabled={isLoading} className="w-full">
                {isLoading ? 'Setting up...' : 'Begin Setup'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Scan QR Code Step
  if (currentStep === 'scan') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>Step 1 of 2: Connect your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Open your authenticator app and scan this QR code:
            </p>

            {qrCode && (
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                <img src={qrCode} alt="QR Code for MFA setup" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Can't scan the QR code?</p>
              <p className="text-sm text-gray-700">Enter this code manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={() => setCurrentStep('verify')} className="w-full">
                Continue to Verification
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verify Token Step
  if (currentStep === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Setup</CardTitle>
          <CardDescription>Step 2 of 2: Enter verification code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenError && <Alert variant="error">{tokenError}</Alert>}

          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Enter the 6-digit code from your authenticator app to verify the setup:
            </p>

            <div className="space-y-2">
              <Label htmlFor="verificationCode" required>
                Verification Code
              </Label>
              <Input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationToken}
                onChange={(e) => {
                  setVerificationToken(e.target.value.replace(/\D/g, ''));
                  setTokenError('');
                }}
                disabled={isLoading}
                className={tokenError ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-600">
                The code changes every 30 seconds
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('scan')}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyToken}
                disabled={isLoading || verificationToken.length !== 6}
                className="flex-1"
              >
                {isLoading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Backup Codes Step
  if (currentStep === 'backup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Backup Codes</CardTitle>
          <CardDescription>Important: Store these codes in a safe place</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="warning">
            <p className="font-semibold">Keep these codes safe!</p>
            <p className="mt-1 text-sm">
              You can use these backup codes to access your account if you lose your authenticator
              device.
            </p>
          </Alert>

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 border rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadBackupCodes}
                className="flex-1"
              >
                Download Codes
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                I've Saved My Codes
              </Button>
            </div>

            <p className="text-xs text-center text-gray-600">
              Each backup code can only be used once
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
