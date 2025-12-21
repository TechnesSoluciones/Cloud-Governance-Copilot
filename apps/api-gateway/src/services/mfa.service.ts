import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { hashPassword, comparePassword } from '../utils/password';
import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';
/**
 * MFA Service
 * Handles Multi-Factor Authentication using TOTP (Time-based One-Time Password)
 */

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

export interface MFAVerifyResponse {
  success: boolean;
  message?: string;
}

export class MFAService {
  /**
   * Initialize MFA setup
   * Generates TOTP secret and QR code
   */
  async setupMFA(userId: string): Promise<MFASetupResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled for this user');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Cloud Governance Copilot (${user.email})`,
      issuer: 'Cloud Governance Copilot',
      length: 32,
    });

    // Generate QR code URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url as string);

    logger.info(`MFA setup initiated for user: ${user.email}`);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  }

  /**
   * Verify MFA setup with a token and enable MFA
   * Also generates backup codes
   */
  async verifySetup(
    userId: string,
    token: string,
    secret: string
  ): Promise<MFASetupResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps before/after for clock skew
    });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashPassword(code))
    );

    // Encrypt the MFA secret
    const encryptedSecret = encrypt(secret);
    const encryptedSecretJson = JSON.stringify(encryptedSecret);

    // Enable MFA and store encrypted secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptedSecretJson,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    logger.info(`MFA enabled successfully for user: ${user.email}`);

    return {
      secret: secret,
      qrCodeUrl: '', // Not needed after setup
      backupCodes,
    };
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFA(userId: string, token: string): Promise<MFAVerifyResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return { success: false, message: 'MFA is not enabled for this user' };
    }

    try {
      // Decrypt the MFA secret
      const encryptedSecret = JSON.parse(user.mfaSecret);
      const secret = decrypt(encryptedSecret);

      // Verify the token
      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before/after for clock skew
      });

      if (isValid) {
        logger.info(`MFA verification successful for user: ${user.email}`);
        return { success: true };
      }

      return { success: false, message: 'Invalid verification code' };
    } catch (error: any) {
      logger.error('MFA verification error:', error);
      return { success: false, message: 'MFA verification failed' };
    }
  }

  /**
   * Verify backup code during login
   * Backup codes are one-time use only
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerifyResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.mfaEnabled || !user.mfaBackupCodes) {
      return { success: false, message: 'MFA is not enabled for this user' };
    }

    const backupCodes = user.mfaBackupCodes as string[];

    // Check each backup code
    for (let i = 0; i < backupCodes.length; i++) {
      const isValid = await comparePassword(code, backupCodes[i]);

      if (isValid) {
        // Remove the used backup code
        const updatedCodes = backupCodes.filter((_, index) => index !== i);

        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaBackupCodes: updatedCodes.length > 0 ? updatedCodes : undefined,
          },
        });

        logger.info(`Backup code used for user: ${user.email}. Remaining codes: ${updatedCodes.length}`);

        return {
          success: true,
          message: `Backup code accepted. You have ${updatedCodes.length} backup codes remaining.`,
        };
      }
    }

    return { success: false, message: 'Invalid backup code' };
  }

  /**
   * Disable MFA (requires password and current token)
   */
  async disableMFA(userId: string, password: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaEnabled) {
      throw new Error('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Verify current MFA token
    const mfaVerification = await this.verifyMFA(userId, token);
    if (!mfaVerification.success) {
      throw new Error('Invalid MFA token');
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: undefined,
        mfaBackupCodes: undefined,
      },
    });

    logger.info(`MFA disabled for user: ${user.email}`);
  }

  /**
   * Generate new backup codes (requires password and token)
   */
  async regenerateBackupCodes(
    userId: string,
    password: string,
    token: string
  ): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.mfaEnabled) {
      throw new Error('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Verify current MFA token
    const mfaVerification = await this.verifyMFA(userId, token);
    if (!mfaVerification.success) {
      throw new Error('Invalid MFA token');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashPassword(code))
    );

    // Update backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    logger.info(`Backup codes regenerated for user: ${user.email}`);

    return backupCodes;
  }

  /**
   * Generate random backup codes
   * Format: XXXX-XXXX-XXXX (12 characters, 3 groups of 4)
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 12; j++) {
        if (j > 0 && j % 4 === 0) {
          code += '-';
        }
        code += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Check if MFA is enabled for user
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    return user?.mfaEnabled || false;
  }
}

export const mfaService = new MFAService();
