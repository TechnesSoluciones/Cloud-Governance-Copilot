'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userProfileSchema, UserProfileInput } from '@/lib/validation/auth';
import { User, UpdateUserDto } from '@/lib/api/user';

export interface UserProfileFormProps {
  user: User;
  onSave: (data: UpdateUserDto) => Promise<void>;
}

export function UserProfileForm({ user, onSave }: UserProfileFormProps) {
  const [formData, setFormData] = useState<UserProfileInput>({
    fullName: user.fullName,
    email: user.email,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserProfileInput, string>>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for unsaved changes
  useEffect(() => {
    const changed =
      formData.fullName !== user.fullName || formData.email !== user.email;
    setHasChanges(changed);
  }, [formData, user]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleChange = (field: keyof UserProfileInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setServerError('');
    setIsSuccess(false);
  };

  const handleBlur = (field: keyof UserProfileInput) => () => {
    // Validate field on blur
    const result = userProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldError = result.error.errors.find((err) => err.path[0] === field);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setErrors({});
    setIsSuccess(false);

    // Validate form
    const result = userProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof UserProfileInput, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof UserProfileInput;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const updateData: UpdateUserDto = {};

      // Only send changed fields
      if (formData.fullName !== user.fullName) {
        updateData.fullName = formData.fullName;
      }
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }

      await onSave(updateData);
      setIsSuccess(true);
      setHasChanges(false);

      // Clear success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
    });
    setErrors({});
    setServerError('');
    setIsSuccess(false);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and email address</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <Alert variant="error">{serverError}</Alert>}
          {isSuccess && (
            <Alert variant="success">
              Profile updated successfully!
              {formData.email !== user.email && (
                <p className="mt-1 text-sm">
                  A verification email has been sent to your new email address.
                </p>
              )}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName" required>
              Full Name
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange('fullName')}
              onBlur={handleBlur('fullName')}
              disabled={isLoading}
              className={errors.fullName ? 'border-red-500' : ''}
            />
            {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              disabled={isLoading}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            {formData.email !== user.email && (
              <p className="text-sm text-yellow-600">
                Changing your email will require verification
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input type="text" value={user.role} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-600">Your role cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <Input type="text" value={user.tenantId} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-600">Your organization identifier</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || !hasChanges}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !hasChanges}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {hasChanges && (
            <p className="text-sm text-yellow-600">You have unsaved changes</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
