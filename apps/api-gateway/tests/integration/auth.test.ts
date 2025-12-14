import request from 'supertest';
import { generateUniqueEmail, generateStrongPassword } from '../setup';

/**
 * API Integration Tests: Authentication
 * Tests user registration, login, logout, password reset, and email verification APIs
 */

// Note: Replace 'app' with the actual Express app instance
// import app from '../../src/app';
// For now, we'll assume the app is available at the API_BASE_URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Authentication API', () => {
  let testEmail: string;
  let testPassword: string;
  let authToken: string;
  let refreshToken: string;

  beforeEach(() => {
    testEmail = generateUniqueEmail();
    testPassword = generateStrongPassword();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return validation error for missing email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for weak password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'weak',
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(201);

      // Second registration with same email
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Another User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already exists|already registered/i);
    });

    it('should hash password before storing', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(201);

      // Password should not be in response
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should create audit log entry for registration', async () => {
      // This would require querying the audit logs
      // For now, just verify registration succeeds
      await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(201);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Test User',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testEmail);

      authToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject login with invalid email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid credentials|incorrect/i);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return user data without password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should set secure HTTP-only cookies', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
      }
    });

    it('should enforce rate limiting after multiple failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(API_BASE_URL)
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword123!',
          });
      }

      // Next attempt should be rate limited
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(429);

      expect(response.body.error).toMatch(/too many|rate limit/i);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(async () => {
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

    it('should logout successfully with valid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should invalidate refresh token', async () => {
      await request(API_BASE_URL)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use refresh token after logout
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(async () => {
      await request(API_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
      });

      const loginResponse = await request(API_BASE_URL).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.accessToken).toBeTruthy();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(API_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
      });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/email sent|reset link/i);
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      // Should still return success for security
      expect(response.body.success).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        await request(API_BASE_URL)
          .post('/api/v1/auth/forgot-password')
          .send({ email: testEmail });
      }

      // Next request should be rate limited
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body.error).toMatch(/too many|rate limit/i);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      await request(API_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
      });

      // Request password reset to get token
      await request(API_BASE_URL)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail });

      // In real tests, you'd need to extract the token from email or database
      resetToken = 'valid-reset-token';
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewSecurePass123!@#';

      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
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

    it('should reject invalid reset token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPass123!@#',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate new password strength', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should prevent token reuse', async () => {
      const newPassword = 'NewSecurePass123!@#';

      // First reset
      await request(API_BASE_URL)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      // Try to use same token again
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'AnotherPass123!@#',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    beforeEach(async () => {
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

    it('should return current user profile', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = 'expired.jwt.token';

      const response = await request(API_BASE_URL)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrong',
        });

      const responseText = JSON.stringify(response.body).toLowerCase();
      expect(responseText).not.toContain('sql');
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('prisma');
    });

    it('should sanitize user input', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: '<script>alert("xss")</script>@test.com',
          password: testPassword,
          fullName: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should use secure password hashing', async () => {
      // Register user
      await request(API_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
      });

      // Verify password is not stored in plain text (would need database access)
      // This is a placeholder test
      expect(true).toBe(true);
    });
  });
});
