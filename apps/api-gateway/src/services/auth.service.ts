import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { RegisterDto, LoginDto, AuthResponse } from '../types/auth.types';
import { logger } from '../utils/logger';
import { generateSecureToken, isValidTokenFormat } from '../utils/token';
import { setRedisValue, getRedisValue, deleteRedisValue } from '../config/redis';
import { emailService } from './email.service';

const prisma = new PrismaClient();

export class AuthService {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const { email, password, fullName, tenantName } = data;

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Check if this is the first user (create tenant)
    let tenantId: string;
    let role = 'viewer';

    const userCount = await prisma.user.count();

    if (userCount === 0 || tenantName) {
      // Create new tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: tenantName || `${fullName}'s Organization`,
          slug: this.generateSlug(tenantName || fullName),
          planType: 'starter',
          status: 'active',
        },
      });
      tenantId = tenant.id;
      role = 'admin'; // First user is admin
    } else {
      // For now, throw error - multi-tenant registration needs invitation
      throw new Error('Tenant registration requires invitation');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        tenantId,
        role,
        status: 'active',
      },
    });

    logger.info(`User registered: ${user.email}`);

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const { email, password, mfaToken } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check email verification (configurable via environment variable)
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (requireEmailVerification && !user.emailVerified) {
      throw new Error('Email not verified. Please check your email for verification link.');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // If MFA token is not provided, return a special response indicating MFA is required
      if (!mfaToken) {
        return {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            tenantId: user.tenantId,
          },
          tokens: {
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
          },
          requiresMFA: true,
        };
      }

      // Verify MFA token
      const { mfaService } = await import('./mfa.service');
      const mfaResult = await mfaService.verifyMFA(user.id, mfaToken);

      // If MFA verification failed, try backup code
      if (!mfaResult.success) {
        const backupResult = await mfaService.verifyBackupCode(user.id, mfaToken);
        if (!backupResult.success) {
          throw new Error('Invalid MFA token or backup code');
        }
        logger.info(`User logged in with backup code: ${user.email}`);
      } else {
        logger.info(`User logged in with MFA: ${user.email}`);
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Request password reset
   * Generates secure token and stores in Redis with 1 hour TTL
   * Always returns success (don't reveal if email exists)
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Always return success, even if user doesn't exist (security)
      if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        // Simulate delay to prevent timing attacks
        await new Promise((resolve) => setTimeout(resolve, 100));
        return;
      }

      // Check if user is active
      if (user.status !== 'active') {
        logger.warn(
          `Password reset requested for inactive user: ${email} (${user.status})`
        );
        return;
      }

      // Generate secure token
      const resetToken = generateSecureToken(32);

      // Store in Redis with 1 hour TTL
      const redisKey = `password-reset:${resetToken}`;
      const redisValue = JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      await setRedisValue(redisKey, redisValue, 3600); // 1 hour = 3600 seconds

      logger.info(`Password reset token generated for user: ${user.email}`);

      // Send reset email
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.fullName || undefined
      );
    } catch (error) {
      logger.error('Password reset request error:', error);
      // Don't throw error - always appear successful
    }
  }

  /**
   * Verify password reset token
   * Returns token validity and email if valid
   */
  async verifyResetToken(
    token: string
  ): Promise<{ valid: boolean; email?: string }> {
    try {
      // Validate token format
      if (!isValidTokenFormat(token)) {
        return { valid: false };
      }

      const redisKey = `password-reset:${token}`;
      const redisValue = await getRedisValue(redisKey);

      if (!redisValue) {
        return { valid: false };
      }

      const data = JSON.parse(redisValue);
      return { valid: true, email: data.email };
    } catch (error) {
      logger.error('Verify reset token error:', error);
      return { valid: false };
    }
  }

  /**
   * Reset password with token
   * Validates token, updates password, and invalidates token
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    // Validate token format
    if (!isValidTokenFormat(token)) {
      throw new Error('Invalid token format');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Get token data from Redis
    const redisKey = `password-reset:${token}`;
    const redisValue = await getRedisValue(redisKey);

    if (!redisValue) {
      throw new Error('Invalid or expired token');
    }

    let tokenData: { userId: string; email: string; createdAt: string };
    try {
      tokenData = JSON.parse(redisValue);
    } catch (error) {
      throw new Error('Invalid token data');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate token (delete from Redis)
    await deleteRedisValue(redisKey);

    logger.info(`Password reset successful for user: ${user.email}`);

    // Generate new auth tokens (auto-login)
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens,
    };
  }
}

export const authService = new AuthService();
