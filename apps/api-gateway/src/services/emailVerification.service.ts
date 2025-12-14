import { PrismaClient } from '@prisma/client';
import { generateSecureToken, isValidTokenFormat } from '../utils/token';
import { setRedisValue, getRedisValue, deleteRedisValue } from '../config/redis';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Email Verification Service
 * Handles email verification flow with Redis-backed tokens
 */
export class EmailVerificationService {
  /**
   * Send verification email to user
   * Generates a secure token and stores it in Redis with 24-hour TTL
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Generate secure verification token
    const verificationToken = generateSecureToken(32);

    // Store in Redis with 24-hour TTL (86400 seconds)
    const redisKey = `email-verification:${verificationToken}`;
    const redisValue = JSON.stringify({
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    });

    await setRedisValue(redisKey, redisValue, 86400); // 24 hours

    // Also store in database for reference (optional, for admin visibility)
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`Email verification token generated for user: ${user.email}`);

    // Send verification email
    await emailService.sendEmailVerificationEmail(
      user.email,
      verificationToken,
      user.fullName || undefined
    );
  }

  /**
   * Verify email with token
   * Validates token and marks email as verified
   */
  async verifyEmail(token: string): Promise<{ success: boolean; email?: string }> {
    try {
      // Validate token format
      if (!isValidTokenFormat(token)) {
        return { success: false };
      }

      // Get token data from Redis
      const redisKey = `email-verification:${token}`;
      const redisValue = await getRedisValue(redisKey);

      if (!redisValue) {
        return { success: false };
      }

      const tokenData = JSON.parse(redisValue);

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: tokenData.userId },
      });

      if (!user) {
        return { success: false };
      }

      // Check if already verified
      if (user.emailVerified) {
        // Clean up token even if already verified
        await deleteRedisValue(redisKey);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerificationToken: null,
            emailVerificationExpires: null,
          },
        });
        return { success: true, email: user.email };
      }

      // Mark email as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      // Delete token from Redis
      await deleteRedisValue(redisKey);

      logger.info(`Email verified successfully for user: ${user.email}`);

      return { success: true, email: user.email };
    } catch (error: any) {
      logger.error('Email verification error:', error);
      return { success: false };
    }
  }

  /**
   * Resend verification email
   * Rate limiting should be applied at the controller level
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    // Delete existing token from Redis if it exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Delete old token from Redis if exists
    if (user.emailVerificationToken) {
      const oldRedisKey = `email-verification:${user.emailVerificationToken}`;
      await deleteRedisValue(oldRedisKey);
    }

    // Send new verification email
    await this.sendVerificationEmail(userId);
  }

  /**
   * Check if user's email is verified
   */
  async isEmailVerified(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    return user?.emailVerified || false;
  }

  /**
   * Clean up expired tokens from database
   * This should be run periodically via a cron job
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.user.updateMany({
      where: {
        emailVerificationExpires: {
          lt: new Date(),
        },
        emailVerificationToken: {
          not: null,
        },
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    logger.info(`Cleaned up ${result.count} expired email verification tokens`);
    return result.count;
  }
}

export const emailVerificationService = new EmailVerificationService();
