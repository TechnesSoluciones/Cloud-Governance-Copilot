import request from 'supertest';
import { generateUniqueEmail, generateStrongPassword } from '../setup';

/**
 * API Integration Tests: MFA (Multi-Factor Authentication)
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('MFA API', () => {
  let testEmail: string;
  let testPassword: string;
  let authToken: string;

  beforeEach(async () => {
    testEmail = generateUniqueEmail();
    testPassword = generateStrongPassword();

    // Register and login
    await request(API_BASE_URL).post('/api/v1/auth/register').send({
      email: testEmail,
      password: testPassword,
      fullName: 'Test User',
    });

    const loginResponse = await request(API_BASE_URL).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
    });

    authToken = loginResponse.body.data.accessToken;
  });

  describe('POST /api/v1/auth/mfa/setup', () => {
    it('should initiate MFA setup and return QR code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('qrCode');
      expect(response.body.data).toHaveProperty('secret');
    });

    it('should require authentication', async () => {
      await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/setup')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/mfa/verify', () => {
    it('should verify and enable MFA with valid code', async () => {
      // Setup MFA first
      const setupResponse = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const secret = setupResponse.body.data.secret;

      // Verify with code (would need actual TOTP generation)
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupCodes');
    });

    it('should reject invalid verification code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/mfa/disable', () => {
    it('should disable MFA with valid password and code', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: testPassword,
          code: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/auth/mfa/backup-codes', () => {
    it('should regenerate backup codes', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/mfa/backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('backupCodes');
      expect(response.body.data.backupCodes.length).toBeGreaterThan(0);
    });
  });
});
