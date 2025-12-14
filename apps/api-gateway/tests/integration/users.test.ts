import request from 'supertest';
import { generateUniqueEmail, generateStrongPassword } from '../setup';

/**
 * API Integration Tests: User Management
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Users API', () => {
  let testEmail: string;
  let testPassword: string;
  let authToken: string;

  beforeEach(async () => {
    testEmail = generateUniqueEmail();
    testPassword = generateStrongPassword();

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

  describe('GET /api/v1/users/profile', () => {
    it('should return user profile', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Updated Name',
          jobTitle: 'Senior Engineer',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe('Updated Name');
    });

    it('should validate email format when updating', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/password', () => {
    it('should change password with valid current password', async () => {
      const newPassword = 'NewSecurePass123!@#';

      const response = await request(API_BASE_URL)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewSecurePass123!@#',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate new password strength', async () => {
      const response = await request(API_BASE_URL)
        .put('/api/v1/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users/verify-email/resend', () => {
    it('should resend verification email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/users/verify-email/resend')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should enforce rate limiting', async () => {
      for (let i = 0; i < 4; i++) {
        await request(API_BASE_URL)
          .post('/api/v1/users/verify-email/resend')
          .set('Authorization', `Bearer ${authToken}`);
      }

      const response = await request(API_BASE_URL)
        .post('/api/v1/users/verify-email/resend')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(429);

      expect(response.body.error).toMatch(/rate limit|too many/i);
    });
  });

  describe('GET /api/v1/users/audit-logs', () => {
    it('should return user audit logs', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/users/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(Array.isArray(response.body.data.logs)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/users/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by date range', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/users/audit-logs?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
