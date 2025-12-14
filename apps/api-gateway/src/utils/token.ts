import * as crypto from 'crypto';

/**
 * Token Generation Utilities
 * For password reset, email verification, and other secure tokens
 */

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns URL-safe base64 encoded token
 */
export const generateSecureToken = (length: number = 32): string => {
  const buffer = crypto.randomBytes(length);
  // Use URL-safe base64 encoding (replace + with - and / with _)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate a numeric OTP code
 * @param length - Length of the OTP (default: 6)
 * @returns Numeric OTP string
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
};

/**
 * Hash a token using SHA-256
 * Useful for storing token hashes in database
 * @param token - Token to hash
 * @returns Hex-encoded hash
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a short alphanumeric code
 * @param length - Length of the code (default: 8)
 * @returns Alphanumeric code
 */
export const generateShortCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous chars
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  return code;
};

/**
 * Validate token format (URL-safe base64)
 * @param token - Token to validate
 * @returns true if valid format
 */
export const isValidTokenFormat = (token: string): boolean => {
  // URL-safe base64 pattern
  const pattern = /^[A-Za-z0-9_-]+$/;
  return pattern.test(token) && token.length >= 32;
};
