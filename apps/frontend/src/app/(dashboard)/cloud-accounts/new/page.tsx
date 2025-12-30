/**
 * New Cloud Account V2 Page
 * CloudNexus Design - Wizard to Connect New Cloud Account
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BadgeV2 } from '@/components/ui/BadgeV2';
import { cn } from '@/lib/utils';
import { createCloudAccount, type CloudAccountCredentials } from '@/lib/api/cloud-accounts';

type CloudProvider = 'AWS' | 'AZURE' | 'GCP' | null;
type WizardStep = 'provider' | 'credentials' | 'test' | 'complete';

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

export default function NewCloudAccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<WizardStep>('provider');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'idle' });

  const [formData, setFormData] = useState({
    accountName: '',
    // AWS
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    // Azure
    azureSubscriptionId: '',
    azureTenantId: '',
    azureClientId: '',
    azureClientSecret: '',
    // GCP
    gcpProjectId: '',
    gcpServiceAccountKey: '',
  });

  const steps = [
    { id: 'provider', label: 'Select Provider', icon: 'cloud' },
    { id: 'credentials', label: 'Enter Credentials', icon: 'vpn_key' },
    { id: 'test', label: 'Test Connection', icon: 'check_circle' },
    { id: 'complete', label: 'Complete', icon: 'done_all' },
  ];

  const getCurrentStepIndex = () => steps.findIndex((s) => s.id === currentStep);

  const handleProviderSelect = (provider: CloudProvider) => {
    setSelectedProvider(provider);
    setCurrentStep('credentials');
  };

  const handleTestConnection = async () => {
    if (!session || !selectedProvider) {
      setConnectionStatus({
        status: 'error',
        message: 'Session or provider not selected.',
      });
      return;
    }

    setConnectionStatus({ status: 'testing', message: 'Creating cloud account...' });

    try {
      // Prepare credentials based on provider
      const credentials: CloudAccountCredentials = {};

      if (selectedProvider === 'AWS') {
        credentials.accessKeyId = formData.awsAccessKeyId;
        credentials.secretAccessKey = formData.awsSecretAccessKey;
        credentials.region = formData.awsRegion;
      } else if (selectedProvider === 'AZURE') {
        credentials.subscriptionId = formData.azureSubscriptionId;
        credentials.tenantId = formData.azureTenantId;
        credentials.clientId = formData.azureClientId;
        credentials.clientSecret = formData.azureClientSecret;
      } else if (selectedProvider === 'GCP') {
        credentials.projectId = formData.gcpProjectId;
        // Parse service account key JSON
        try {
          const serviceAccountKey = JSON.parse(formData.gcpServiceAccountKey);
          credentials.clientEmail = serviceAccountKey.client_email;
          credentials.privateKey = serviceAccountKey.private_key;
        } catch (e) {
          setConnectionStatus({
            status: 'error',
            message: 'Invalid service account key JSON format.',
          });
          return;
        }
      }

      // Call API to create cloud account
      const response = await createCloudAccount(
        {
          provider: selectedProvider,
          name: formData.accountName,
          credentials,
        },
        (session as any).accessToken
      );

      if (response.success) {
        setConnectionStatus({
          status: 'success',
          message: 'Connection successful! Account created.',
        });
        setTimeout(() => setCurrentStep('complete'), 1500);
      } else {
        setConnectionStatus({
          status: 'error',
          message: response.error?.message || 'Connection failed. Please verify your credentials.',
        });
      }
    } catch (error) {
      console.error('Failed to create cloud account:', error);
      setConnectionStatus({
        status: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const handleComplete = () => {
    router.push('/cloud-accounts');
  };

  return (
    <div className="p-6">
      {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-primary-400 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Accounts
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Connect New Cloud Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Follow the wizard to securely connect your cloud provider account
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      index <= getCurrentStepIndex()
                        ? 'bg-brand-primary-400 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    <span className="material-symbols-outlined text-xl">{step.icon}</span>
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        index <= getCurrentStepIndex()
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Step {index + 1} of {steps.length}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div
                      className={cn(
                        'h-1 rounded-full transition-all',
                        index < getCurrentStepIndex()
                          ? 'bg-brand-primary-400'
                          : 'bg-slate-200 dark:bg-slate-800'
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-8">
          {/* Step 1: Select Provider */}
          {currentStep === 'provider' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Select Cloud Provider
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Choose the cloud provider you want to connect
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
                {/* AWS Card */}
                <button
                  onClick={() => handleProviderSelect('AWS')}
                  className="group p-8 border-2 border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-primary-400 hover:bg-brand-primary-50 dark:hover:bg-brand-primary-400/5 transition-all text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#FF9900]">
                      cloud
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Amazon Web Services
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Connect your AWS account using IAM credentials
                  </p>
                  <BadgeV2 variant="aws" size="sm">
                    AWS
                  </BadgeV2>
                </button>

                {/* Azure Card */}
                <button
                  onClick={() => handleProviderSelect('AZURE')}
                  className="group p-8 border-2 border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-primary-400 hover:bg-brand-primary-50 dark:hover:bg-brand-primary-400/5 transition-all text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#0078d4]/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#0078d4]">
                      cloud
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Microsoft Azure
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Connect your Azure subscription using Service Principal
                  </p>
                  <BadgeV2 variant="azure" size="sm">
                    Azure
                  </BadgeV2>
                </button>

                {/* GCP Card */}
                <button
                  onClick={() => handleProviderSelect('GCP')}
                  className="group p-8 border-2 border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-primary-400 hover:bg-brand-primary-50 dark:hover:bg-brand-primary-400/5 transition-all text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#34A853]/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#34A853]">
                      cloud
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Google Cloud Platform
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Connect your GCP project using Service Account
                  </p>
                  <BadgeV2 variant="gcp" size="sm">
                    GCP
                  </BadgeV2>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Credentials */}
          {currentStep === 'credentials' && selectedProvider && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <BadgeV2
                  variant={selectedProvider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                  size="lg"
                >
                  {selectedProvider}
                </BadgeV2>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Enter Credentials
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Provide your {selectedProvider} account credentials
                  </p>
                </div>
              </div>

              {/* Required Permissions Info */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                    info
                  </span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                      Required Permissions
                    </h3>

                    {selectedProvider === 'AWS' && (
                      <div className="space-y-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          The IAM user or role must have the following permissions to enable full CloudNexus functionality:
                        </p>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Required IAM Policies:
                          </p>
                          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>ReadOnlyAccess</strong> - View all resources and configurations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>SecurityAudit</strong> - Security posture and compliance scanning</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>AWSSupportAccess</strong> - Access to cost and billing information</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">info</span>
                              <span><strong>Custom Policy</strong> - Cost Explorer and Recommendations access (ce:*, trustedadvisor:*)</span>
                            </li>
                          </ul>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          💡 <strong>Tip:</strong> Create a dedicated IAM user for CloudNexus with programmatic access only.
                        </p>
                      </div>
                    )}

                    {selectedProvider === 'AZURE' && (
                      <div className="space-y-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          The Service Principal must have the following role assignments at the Subscription level:
                        </p>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Required Azure Roles:
                          </p>
                          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Reader</strong> - View all resources in the subscription</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Security Reader</strong> - Read security policies and states</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Cost Management Reader</strong> - Access cost and usage data</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">info</span>
                              <span><strong>Monitoring Reader</strong> - Read monitoring data and logs</span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900 mt-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            How to create a Service Principal:
                          </p>
                          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto">
{`az ad sp create-for-rbac --name "CloudNexus" \\
  --role "Reader" \\
  --scopes /subscriptions/{subscription-id}`}
                          </pre>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          💡 <strong>Tip:</strong> Add additional role assignments (Security Reader, Cost Management Reader) after creation.
                        </p>
                      </div>
                    )}

                    {selectedProvider === 'GCP' && (
                      <div className="space-y-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          The Service Account must have the following IAM roles assigned at the Project level:
                        </p>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Required GCP Roles:
                          </p>
                          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Viewer</strong> - Read access to all resources</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Security Reviewer</strong> - Read access to security configurations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                              <span><strong>Cloud Asset Viewer</strong> - List and view all cloud assets</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-sm mt-0.5">info</span>
                              <span><strong>Billing Account Viewer</strong> - Access to cost and billing data</span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900 mt-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            How to create a Service Account:
                          </p>
                          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto">
{`gcloud iam service-accounts create cloudnexus \\
  --display-name="CloudNexus Service Account"

gcloud iam service-accounts keys create key.json \\
  --iam-account=cloudnexus@PROJECT_ID.iam.gserviceaccount.com`}
                          </pre>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          💡 <strong>Tip:</strong> Grant roles at the project level for comprehensive monitoring.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-2xl space-y-6">
                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountName: e.target.value })
                    }
                    placeholder="e.g., Production AWS Account"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                  />
                </div>

                {/* AWS Fields */}
                {selectedProvider === 'AWS' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Access Key ID
                      </label>
                      <input
                        type="text"
                        value={formData.awsAccessKeyId}
                        onChange={(e) =>
                          setFormData({ ...formData, awsAccessKeyId: e.target.value })
                        }
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Secret Access Key
                      </label>
                      <input
                        type="password"
                        value={formData.awsSecretAccessKey}
                        onChange={(e) =>
                          setFormData({ ...formData, awsSecretAccessKey: e.target.value })
                        }
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Default Region
                      </label>
                      <select
                        value={formData.awsRegion}
                        onChange={(e) =>
                          setFormData({ ...formData, awsRegion: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Azure Fields */}
                {selectedProvider === 'AZURE' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Subscription ID
                      </label>
                      <input
                        type="text"
                        value={formData.azureSubscriptionId}
                        onChange={(e) =>
                          setFormData({ ...formData, azureSubscriptionId: e.target.value })
                        }
                        placeholder="12345678-1234-1234-1234-123456789012"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Tenant ID
                      </label>
                      <input
                        type="text"
                        value={formData.azureTenantId}
                        onChange={(e) =>
                          setFormData({ ...formData, azureTenantId: e.target.value })
                        }
                        placeholder="12345678-1234-1234-1234-123456789012"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={formData.azureClientId}
                        onChange={(e) =>
                          setFormData({ ...formData, azureClientId: e.target.value })
                        }
                        placeholder="12345678-1234-1234-1234-123456789012"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={formData.azureClientSecret}
                        onChange={(e) =>
                          setFormData({ ...formData, azureClientSecret: e.target.value })
                        }
                        placeholder="Your client secret"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                  </>
                )}

                {/* GCP Fields */}
                {selectedProvider === 'GCP' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Project ID
                      </label>
                      <input
                        type="text"
                        value={formData.gcpProjectId}
                        onChange={(e) =>
                          setFormData({ ...formData, gcpProjectId: e.target.value })
                        }
                        placeholder="my-project-12345"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Service Account Key (JSON)
                      </label>
                      <textarea
                        value={formData.gcpServiceAccountKey}
                        onChange={(e) =>
                          setFormData({ ...formData, gcpServiceAccountKey: e.target.value })
                        }
                        placeholder='{"type": "service_account", "project_id": "..."}'
                        rows={8}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => setCurrentStep('provider')}
                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep('test')}
                    disabled={!formData.accountName}
                    className="flex-1 px-6 py-2.5 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Test Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Test Connection */}
          {currentStep === 'test' && (
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Test Connection
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Verify your credentials and test the connection
              </p>

              {connectionStatus.status === 'idle' && (
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-brand-primary-400/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-brand-primary-400">
                      vpn_key
                    </span>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    className="px-8 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Test Connection
                  </button>
                </div>
              )}

              {connectionStatus.status === 'testing' && (
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-blue-500 animate-spin">
                      sync
                    </span>
                  </div>
                  <p className="text-lg text-slate-900 dark:text-white">
                    {connectionStatus.message}
                  </p>
                </div>
              )}

              {connectionStatus.status === 'success' && (
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-success">
                      check_circle
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Connection Successful!
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {connectionStatus.message}
                  </p>
                </div>
              )}

              {connectionStatus.status === 'error' && (
                <div>
                  <div className="w-24 h-24 mx-auto mb-6 bg-error/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-error">error</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Connection Failed
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {connectionStatus.message}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setCurrentStep('credentials')}
                      className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit Credentials
                    </button>
                    <button
                      onClick={handleTestConnection}
                      className="px-6 py-2.5 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-success">
                  done_all
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Account Connected Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Your {selectedProvider} account has been securely connected and is ready to use
              </p>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Account Name
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formData.accountName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Provider</span>
                  <BadgeV2
                    variant={selectedProvider!.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                    size="sm"
                  >
                    {selectedProvider}
                  </BadgeV2>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-brand-primary-400 text-white rounded-lg font-semibold hover:bg-brand-primary-500 transition-colors flex items-center gap-2 mx-auto"
              >
                Go to Cloud Accounts
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
    </div>
  );
}
