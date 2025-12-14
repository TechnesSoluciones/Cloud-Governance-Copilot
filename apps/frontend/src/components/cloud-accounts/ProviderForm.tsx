'use client';

import * as React from 'react';
import { CloudProvider } from './AccountCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSelect, SelectOption } from '@/components/ui/select';

export interface ProviderFormData {
  provider: CloudProvider;
  name: string;
  // AWS
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  // Azure
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  subscriptionId?: string;
  // GCP
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

export interface ProviderFormProps {
  provider: CloudProvider;
  data: ProviderFormData;
  onChange: (data: ProviderFormData) => void;
  errors?: Record<string, string>;
}

const awsRegions: SelectOption[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-west-2', label: 'EU (London)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

export const ProviderForm: React.FC<ProviderFormProps> = ({
  provider,
  data,
  onChange,
  errors = {},
}) => {
  const handleChange = (field: keyof ProviderFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Account Name - Common to all providers */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Account Name <span className="text-red-500" aria-label="required">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={data.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Production AWS Account"
          className={errors.name ? 'border-red-500' : ''}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-500" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {/* AWS-specific fields */}
      {provider === 'aws' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">
              Access Key ID <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="accessKeyId"
              type="text"
              value={data.accessKeyId || ''}
              onChange={(e) => handleChange('accessKeyId', e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className={errors.accessKeyId ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.accessKeyId}
              aria-describedby={errors.accessKeyId ? 'accessKeyId-error' : undefined}
            />
            {errors.accessKeyId && (
              <p id="accessKeyId-error" className="text-sm text-red-500" role="alert">
                {errors.accessKeyId}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">
              Secret Access Key <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="secretAccessKey"
              type="password"
              value={data.secretAccessKey || ''}
              onChange={(e) => handleChange('secretAccessKey', e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              className={errors.secretAccessKey ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.secretAccessKey}
              aria-describedby={errors.secretAccessKey ? 'secretAccessKey-error' : undefined}
            />
            {errors.secretAccessKey && (
              <p id="secretAccessKey-error" className="text-sm text-red-500" role="alert">
                {errors.secretAccessKey}
              </p>
            )}
          </div>
          <SimpleSelect
            label="Region"
            value={data.region}
            onValueChange={(value) => handleChange('region', value)}
            options={awsRegions}
            placeholder="Select a region"
            error={errors.region}
          />
        </>
      )}

      {/* Azure-specific fields */}
      {provider === 'azure' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tenantId">
              Tenant ID <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="tenantId"
              type="text"
              value={data.tenantId || ''}
              onChange={(e) => handleChange('tenantId', e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className={errors.tenantId ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.tenantId}
              aria-describedby={errors.tenantId ? 'tenantId-error' : undefined}
            />
            {errors.tenantId && (
              <p id="tenantId-error" className="text-sm text-red-500" role="alert">
                {errors.tenantId}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client ID <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="clientId"
              type="text"
              value={data.clientId || ''}
              onChange={(e) => handleChange('clientId', e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className={errors.clientId ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.clientId}
              aria-describedby={errors.clientId ? 'clientId-error' : undefined}
            />
            {errors.clientId && (
              <p id="clientId-error" className="text-sm text-red-500" role="alert">
                {errors.clientId}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientSecret">
              Client Secret <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="clientSecret"
              type="password"
              value={data.clientSecret || ''}
              onChange={(e) => handleChange('clientSecret', e.target.value)}
              placeholder="Your client secret"
              className={errors.clientSecret ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.clientSecret}
              aria-describedby={errors.clientSecret ? 'clientSecret-error' : undefined}
            />
            {errors.clientSecret && (
              <p id="clientSecret-error" className="text-sm text-red-500" role="alert">
                {errors.clientSecret}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscriptionId">
              Subscription ID <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="subscriptionId"
              type="text"
              value={data.subscriptionId || ''}
              onChange={(e) => handleChange('subscriptionId', e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className={errors.subscriptionId ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.subscriptionId}
              aria-describedby={errors.subscriptionId ? 'subscriptionId-error' : undefined}
            />
            {errors.subscriptionId && (
              <p id="subscriptionId-error" className="text-sm text-red-500" role="alert">
                {errors.subscriptionId}
              </p>
            )}
          </div>
        </>
      )}

      {/* GCP-specific fields */}
      {provider === 'gcp' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="projectId">
              Project ID <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="projectId"
              type="text"
              value={data.projectId || ''}
              onChange={(e) => handleChange('projectId', e.target.value)}
              placeholder="my-project-12345"
              className={errors.projectId ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.projectId}
              aria-describedby={errors.projectId ? 'projectId-error' : undefined}
            />
            {errors.projectId && (
              <p id="projectId-error" className="text-sm text-red-500" role="alert">
                {errors.projectId}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">
              Service Account Email <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={data.clientEmail || ''}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              placeholder="service-account@my-project.iam.gserviceaccount.com"
              className={errors.clientEmail ? 'border-red-500' : ''}
              aria-required="true"
              aria-invalid={!!errors.clientEmail}
              aria-describedby={errors.clientEmail ? 'clientEmail-error' : undefined}
            />
            {errors.clientEmail && (
              <p id="clientEmail-error" className="text-sm text-red-500" role="alert">
                {errors.clientEmail}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="privateKey">
              Private Key <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <textarea
              id="privateKey"
              value={data.privateKey || ''}
              onChange={(e) => handleChange('privateKey', e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              className={`flex min-h-[120px] w-full rounded-md border ${
                errors.privateKey ? 'border-red-500' : 'border-input'
              } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
              aria-required="true"
              aria-invalid={!!errors.privateKey}
              aria-describedby={errors.privateKey ? 'privateKey-error' : undefined}
            />
            {errors.privateKey && (
              <p id="privateKey-error" className="text-sm text-red-500" role="alert">
                {errors.privateKey}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
