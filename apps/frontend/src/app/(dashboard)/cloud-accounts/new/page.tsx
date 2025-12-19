'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProviderForm, ProviderFormData } from '@/components/cloud-accounts/ProviderForm';
import { CloudProvider } from '@/components/cloud-accounts/AccountCard';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import ErrorBoundary from '@/components/ErrorBoundary';
import { CardSkeleton } from '@/components/skeletons';
import { createCloudAccount, testCloudAccountConnection, CloudAccountInput } from '@/lib/api/cloud-accounts';
import { ApiError } from '@/lib/api/client';

// Premium Design System Components
import {
  PremiumSectionHeader,
  PREMIUM_GRADIENTS,
} from '@/components/shared/premium';

type WizardStep = 'provider' | 'credentials' | 'test' | 'complete';

function NewCloudAccountPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = React.useState<WizardStep>('provider');
  const [selectedProvider, setSelectedProvider] = React.useState<CloudProvider | null>(null);
  const [formData, setFormData] = React.useState<ProviderFormData>({
    provider: 'AWS',
    name: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [testResult, setTestResult] = React.useState<'success' | 'failure' | null>(null);
  const [createdAccountId, setCreatedAccountId] = React.useState<string | null>(null);

  const providers: Array<{
    id: CloudProvider;
    name: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'AWS',
      name: 'Amazon Web Services',
      description: 'Connect your AWS account for comprehensive governance',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.76 10.63c0 .38.03.69.09.93.06.24.15.49.27.76.05.1.07.2.07.28 0 .12-.08.24-.23.37l-.77.51c-.11.07-.22.11-.32.11-.12 0-.24-.06-.36-.17a3.97 3.97 0 01-.43-.56 10.2 10.2 0 01-.37-.69c-.93 1.1-2.1 1.65-3.51 1.65-.95 0-1.71-.27-2.27-.82-.56-.55-.84-1.28-.84-2.2 0-.97.34-1.76 1.03-2.35.69-.59 1.6-.89 2.75-.89.38 0 .77.03 1.18.09.41.06.83.15 1.28.26V6.9c0-.68-.14-1.16-.43-1.44-.29-.29-.78-.43-1.48-.43-.32 0-.65.04-.99.11-.34.07-.67.17-.99.28-.15.05-.26.09-.32.11-.06.01-.11.02-.14.02-.12 0-.18-.09-.18-.27V4.8c0-.14.02-.24.07-.31.05-.06.14-.12.28-.18.32-.16.7-.3 1.15-.41A5.4 5.4 0 015.77 3.7c1.02 0 1.77.23 2.26.7.48.47.72 1.19.72 2.16v2.85l.01.22zm-4.84 1.81c.37 0 .75-.07 1.15-.2.4-.14.76-.38 1.06-.73.18-.22.32-.46.4-.74.08-.28.13-.61.13-.99v-.48c-.34-.08-.7-.15-1.07-.2-.37-.05-.74-.08-1.1-.08-.63 0-1.09.12-1.39.37-.3.25-.45.6-.45 1.07 0 .44.11.77.34 1 .23.24.56.36 1.01.36l-.08.02zm9.61 1.3c-.15 0-.25-.03-.33-.08-.08-.05-.15-.17-.21-.34l-2.37-7.8c-.06-.19-.09-.32-.09-.39 0-.15.08-.23.23-.23h.95c.16 0 .27.03.34.08.08.05.14.17.2.34l1.7 6.7 1.57-6.7c.05-.19.12-.31.19-.34.08-.05.19-.08.35-.08h.77c.16 0 .27.03.35.08.08.05.15.17.19.34l1.59 6.78 1.75-6.78c.06-.19.13-.31.21-.34.08-.05.19-.08.34-.08h.9c.15 0 .23.08.23.23 0 .06-.01.12-.03.19-.02.07-.05.16-.1.29l-2.43 7.8c-.06.19-.13.31-.21.34-.08.05-.19.08-.34.08h-.83c-.16 0-.27-.03-.35-.08-.08-.06-.15-.17-.19-.34l-1.56-6.49-1.55 6.48c-.05.19-.12.31-.19.34-.08.05-.19.08-.35.08h-.83zm15.33.32c-.62 0-1.24-.07-1.84-.22-.6-.15-1.07-.32-1.39-.52-.18-.11-.3-.23-.35-.34a.85.85 0 01-.08-.36v-.48c0-.18.07-.27.2-.27.05 0 .1.01.16.03.05.02.13.05.24.1.46.2.96.36 1.49.47.54.11 1.07.17 1.59.17.85 0 1.5-.15 1.97-.44.47-.29.71-.72.71-1.27 0-.37-.12-.69-.36-.94-.24-.25-.69-.48-1.34-.69l-1.92-.6c-.97-.31-1.69-.76-2.13-1.35-.44-.59-.66-1.24-.66-1.94 0-.56.12-1.06.36-1.49.24-.43.56-.8.97-1.11.4-.31.88-.54 1.42-.71.54-.16 1.13-.24 1.75-.24.27 0 .54.01.82.04.28.03.54.07.8.11.25.05.49.1.72.16.23.06.42.13.58.19.15.09.27.19.34.29.07.1.11.23.11.38v.44c0 .18-.07.27-.2.27-.07 0-.19-.04-.35-.11-.54-.25-1.15-.37-1.83-.37-.77 0-1.38.13-1.8.38-.43.25-.64.63-.64 1.14 0 .37.13.68.39.93.26.25.74.51 1.44.75l1.88.6c.95.3 1.65.73 2.08 1.27.43.54.64 1.16.64 1.85 0 .57-.12 1.09-.36 1.54-.24.45-.58.85-1.01 1.18-.43.33-.95.59-1.56.77-.62.18-1.29.27-2.01.27l.01-.01z" />
        </svg>
      ),
    },
    {
      id: 'AZURE',
      name: 'Microsoft Azure',
      description: 'Manage your Azure subscriptions and resources',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.05 10.43L9.09 18.8H4.3l8.75-15.37L9.09 5.57 13.05 10.43zM19.7 18.8h-5.43l-3.96-8.37 1.74-3.06 3.96 6.88 3.69-6.88 3.96 6.88-3.96 6.88z" />
        </svg>
      ),
    },
    {
      id: 'GCP',
      name: 'Google Cloud Platform',
      description: 'Connect your GCP projects and services',
      icon: (
        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.19 2.38a9.344 9.344 0 00-9.234 6.893c.053-.02.108-.029.166-.029.195 0 .395.08.535.227.12.133.175.297.193.459.019.167.009.338.009.508v3.145h.006v.001a.75.75 0 00.75.75h3.293a.75.75 0 00.75-.75v-.001-3.27a.75.75 0 00-.75-.75H5.334v-.002c0-.084-.005-.168-.012-.251a5.684 5.684 0 015.808-5.187 5.688 5.688 0 015.675 5.027h.001v.002h-.001a.717.717 0 00-.012.251v.002h-.001c0 .414.336.75.75.75h3.293a.75.75 0 00.75-.75v-.002-3.27c0-.17-.01-.341.009-.508.018-.162.073-.326.193-.459.14-.146.34-.227.535-.227.058 0 .113.009.166.029A9.344 9.344 0 0012.19 2.38zm-.002 19.24a9.352 9.352 0 008.148-4.787.455.455 0 00-.085-.518.738.738 0 00-.286-.174.717.717 0 00-.679.091l-2.485 1.661a.75.75 0 00-.258.983l.001.002 1.545 2.314a.75.75 0 001.247-.832l-.904-1.355.943-.63a7.853 7.853 0 01-12.217 1.976 7.853 7.853 0 01-1.934-7.647l.002-.004a.75.75 0 00-1.442-.389l-.001.004a9.353 9.353 0 008.405 9.305z" />
        </svg>
      ),
    },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Account name is required';
    }

    if (selectedProvider === 'AWS') {
      if (!formData.accessKeyId) newErrors.accessKeyId = 'Access Key ID is required';
      if (!formData.secretAccessKey) newErrors.secretAccessKey = 'Secret Access Key is required';
      if (!formData.region) newErrors.region = 'Region is required';
    } else if (selectedProvider === 'AZURE') {
      if (!formData.tenantId) newErrors.tenantId = 'Tenant ID is required';
      if (!formData.clientId) newErrors.clientId = 'Client ID is required';
      if (!formData.clientSecret) newErrors.clientSecret = 'Client Secret is required';
      if (!formData.subscriptionId) newErrors.subscriptionId = 'Subscription ID is required';
    } else if (selectedProvider === 'GCP') {
      if (!formData.projectId) newErrors.projectId = 'Project ID is required';
      if (!formData.clientEmail) newErrors.clientEmail = 'Service Account Email is required';
      if (!formData.privateKey) newErrors.privateKey = 'Private Key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProviderSelect = (provider: CloudProvider) => {
    setSelectedProvider(provider);
    setFormData({ ...formData, provider });
    setCurrentStep('credentials');
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (!session) {
      addToast('Session expired. Please login again.', 'error');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Step 1: Create the account first
      const accountInput: CloudAccountInput = {
        provider: selectedProvider!,
        name: formData.name,
        accountIdentifier: formData.subscriptionId || formData.projectId,
        credentials: {
          // AWS
          accessKeyId: formData.accessKeyId,
          secretAccessKey: formData.secretAccessKey,
          region: formData.region,
          // Azure
          tenantId: formData.tenantId,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          subscriptionId: formData.subscriptionId,
          // GCP
          projectId: formData.projectId,
          clientEmail: formData.clientEmail,
          privateKey: formData.privateKey,
        },
      };

      const createResponse = await createCloudAccount(
        accountInput,
        (session as any).accessToken
      );

      if (!createResponse.success || !createResponse.data) {
        throw new Error(createResponse.error?.message || 'Failed to create account');
      }

      const accountId = createResponse.data.id;
      setCreatedAccountId(accountId);

      // Step 2: Test the connection
      const testResponse = await testCloudAccountConnection(
        accountId,
        (session as any).accessToken
      );

      if (testResponse.success && testResponse.data?.status === 'connected') {
        setTestResult('success');
        addToast('Connection test successful', 'success');
        setCurrentStep('test');
      } else {
        setTestResult('failure');
        addToast(
          testResponse.error?.message || 'Connection test failed. Please check your credentials.',
          'error'
        );
      }
    } catch (error) {
      setTestResult('failure');

      if (error instanceof ApiError) {
        addToast(error.message, 'error');
      } else {
        addToast('An error occurred while testing the connection', 'error');
      }

      console.error('Connection test error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleComplete = () => {
    // Account was already created and tested in handleTestConnection
    // Just redirect to accounts list
    addToast('Cloud account added successfully', 'success');
    router.push('/cloud-accounts');
  };

  const steps = [
    { id: 'provider', label: 'Choose Provider' },
    { id: 'credentials', label: 'Enter Credentials' },
    { id: 'test', label: 'Test Connection' },
    { id: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={`min-h-screen ${PREMIUM_GRADIENTS.page}`}>
      <div className="max-w-4xl mx-auto space-y-8 p-6 sm:p-8 lg:p-10">
        {/* Premium Header */}
        <PremiumSectionHeader
          title="Add Cloud Account"
          subtitle="Connect a new cloud provider to your governance platform"
        />

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center gap-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    index < currentStepIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground'
                  }`}
                  aria-current={index === currentStepIndex ? 'step' : undefined}
                >
                  {index < currentStepIndex ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`hidden sm:block text-sm font-medium ${
                    index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      {currentStep === 'provider' && (
        <div className="grid gap-6 md:grid-cols-3">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
              onClick={() => handleProviderSelect(provider.id)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProviderSelect(provider.id);
                }
              }}
              aria-label={`Select ${provider.name}`}
            >
              <CardHeader className="text-center">
                <div className="mx-auto text-primary" aria-hidden="true">
                  {provider.icon}
                </div>
                <CardTitle className="mt-4">{provider.name}</CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {currentStep === 'credentials' && selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Credentials</CardTitle>
            <CardDescription>
              Provide the necessary credentials to connect to your {selectedProvider.toUpperCase()} account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProviderForm
              provider={selectedProvider}
              data={formData}
              onChange={setFormData}
              errors={errors}
            />
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setCurrentStep('provider')}>
                Back
              </Button>
              <Button onClick={handleTestConnection} disabled={isTestingConnection}>
                {isTestingConnection ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'test' && testResult === 'success' && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Successful</CardTitle>
            <CardDescription>
              Your credentials have been verified and the connection is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100">
                  Connection verified successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  We were able to authenticate and access your cloud resources
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-medium">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <Badge>{selectedProvider?.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Connected
                </Badge>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep('credentials')}>
                Back
              </Button>
              <Button onClick={handleComplete}>
                Complete Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

/**
 * Exported page component wrapped in ErrorBoundary
 */
export default function NewCloudAccountPage() {
  return (
    <ErrorBoundary>
      <NewCloudAccountPageContent />
    </ErrorBoundary>
  );
}
