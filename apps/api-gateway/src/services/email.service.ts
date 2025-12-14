import { logger } from '../utils/logger';

// Optional SendGrid dependency - gracefully handle if not installed
let sgMail: any = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (e) {
  // SendGrid is optional for development
}

/**
 * Email Service
 * Integrated with SendGrid for production email sending
 * Falls back to console logging if SendGrid is not configured
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private isConfigured: boolean = false;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@cloudcopilot.com';

    if (sgMail && apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      logger.info('Email Service initialized with SendGrid');
    } else {
      logger.warn('SendGrid API key not configured or module not installed - emails will be logged only');
    }
  }

  /**
   * Send email via SendGrid or log if not configured
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    // Log email details
    logger.info('Email Service - Sending email', {
      to,
      subject,
      htmlLength: html.length,
      textLength: text?.length || 0,
      configured: this.isConfigured,
    });

    if (this.isConfigured) {
      try {
        // Send email via SendGrid
        const msg = {
          to,
          from: this.fromEmail,
          subject,
          html,
          text: text || this.stripHtml(html),
        };

        await sgMail.send(msg);
        logger.info(`Email sent successfully to ${to}: ${subject}`);
      } catch (error: any) {
        logger.error('Failed to send email via SendGrid', {
          error: error.message,
          code: error.code,
          to,
          subject,
        });
        throw new Error(`Email sending failed: ${error.message}`);
      }
    } else {
      // Development mode - log email instead of sending
      logger.info('Development Mode - Email Content:', {
        to,
        from: this.fromEmail,
        subject,
        text: text || this.stripHtml(html).substring(0, 200) + '...',
      });

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info(`[DEV] Email simulated successfully to ${to}: ${subject}`);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3010'}/reset-password/${resetToken}`;

    const html = this.getPasswordResetTemplate(resetUrl, userName);
    const text = this.getPasswordResetTextVersion(resetUrl, userName);

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Cloud Governance Copilot',
      html,
      text,
    });
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3010'}/verify-email/${verificationToken}`;

    const html = this.getEmailVerificationTemplate(verificationUrl, userName);
    const text = this.getEmailVerificationTextVersion(verificationUrl, userName);

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Cloud Governance Copilot',
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3010'}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Cloud Copilot!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Welcome to Cloud Governance Copilot! Your account has been successfully created.</p>
            <p>You can now log in and start managing your cloud resources across AWS, Azure, and GCP.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" class="button">Go to Login</a>
            </p>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Cloud Governance Copilot | Secure Cloud Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to Cloud Governance Copilot!

Hi ${userName},

Your account has been successfully created. You can now log in and start managing your cloud resources.

Login here: ${loginUrl}

If you have any questions, feel free to contact our support team.

Cloud Governance Copilot | Secure Cloud Management
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Cloud Governance Copilot',
      html,
      text,
    });
  }

  /**
   * Get password reset HTML template
   */
  private getPasswordResetTemplate(resetUrl: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>We received a request to reset your password for your Cloud Governance Copilot account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #ff6b35;">${resetUrl}</p>
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>Cloud Governance Copilot | Secure Cloud Management</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get password reset text version
   */
  private getPasswordResetTextVersion(resetUrl: string, userName?: string): string {
    return `
Password Reset Request

Hi ${userName || 'there'},

We received a request to reset your password for your Cloud Governance Copilot account.

Click the link below to reset your password:
${resetUrl}

IMPORTANT: This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Cloud Governance Copilot | Secure Cloud Management
This is an automated email. Please do not reply.
    `;
  }

  /**
   * Get email verification HTML template
   */
  private getEmailVerificationTemplate(verificationUrl: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>Thank you for registering with Cloud Governance Copilot! To complete your registration, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #ff6b35;">${verificationUrl}</p>
            <div class="warning">
              <strong>Important:</strong> This link will expire in 24 hours for security reasons.
            </div>
            <p>If you didn't create an account with Cloud Governance Copilot, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>Cloud Governance Copilot | Secure Cloud Management</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get email verification text version
   */
  private getEmailVerificationTextVersion(verificationUrl: string, userName?: string): string {
    return `
Verify Your Email Address

Hi ${userName || 'there'},

Thank you for registering with Cloud Governance Copilot! To complete your registration, please verify your email address.

Click the link below to verify your email:
${verificationUrl}

IMPORTANT: This link will expire in 24 hours for security reasons.

If you didn't create an account with Cloud Governance Copilot, please ignore this email.

Cloud Governance Copilot | Secure Cloud Management
This is an automated email. Please do not reply.
    `;
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const emailService = new EmailService();
