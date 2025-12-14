import { z } from 'zod';

/**
 * Password validation regex patterns
 */
const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password schema with strong validation
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(UPPERCASE_REGEX, 'Password must contain at least one uppercase letter')
  .regex(LOWERCASE_REGEX, 'Password must contain at least one lowercase letter')
  .regex(NUMBER_REGEX, 'Password must contain at least one number');

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password schema with confirmation
 */
export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Change password schema (requires current password)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * User profile schema
 */
export const userProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  email: emailSchema,
});

/**
 * MFA verification code schema
 */
export const mfaVerificationSchema = z.object({
  token: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers'),
});

/**
 * MFA disable schema (requires password confirmation)
 */
export const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  token: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers'),
});

/**
 * Password strength calculator
 * Returns: 0 (weak), 1 (medium), 2 (strong)
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;
  const checks = [
    password.length >= PASSWORD_MIN_LENGTH,
    UPPERCASE_REGEX.test(password),
    LOWERCASE_REGEX.test(password),
    NUMBER_REGEX.test(password),
    SPECIAL_CHAR_REGEX.test(password),
    password.length >= 12,
  ];

  const passedChecks = checks.filter(Boolean).length;

  if (passedChecks <= 3) strength = 0; // Weak
  else if (passedChecks <= 4) strength = 1; // Medium
  else strength = 2; // Strong

  return strength;
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Weak', 'Medium', 'Strong'];
  return labels[strength] || 'Weak';
}

/**
 * Get password strength color class
 */
export function getPasswordStrengthColor(strength: number): string {
  const colors = ['text-red-600', 'text-yellow-600', 'text-green-600'];
  return colors[strength] || 'text-red-600';
}

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type MFAVerificationInput = z.infer<typeof mfaVerificationSchema>;
export type MFADisableInput = z.infer<typeof mfaDisableSchema>;
