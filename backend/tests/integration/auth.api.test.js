/**
 * API Integration Tests — /api/auth
 * Uses Supertest to test HTTP request/response flows against app.js
 */

const request = require('supertest');
const app = require('../../src/app');

// Mock AuthService and DB dependency
jest.mock('../../src/services/auth.service', () => ({
  signupUser: jest.fn(),
  loginUser: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const authService = require('../../src/services/auth.service');
const db = require('../../src/config/db');

describe('API Integration — /api/auth Endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/auth/signup', () => {
    it('returns HTTP 201 Created on valid registration', async () => {
      authService.signupUser.mockResolvedValue({
        message: 'User registered successfully. Please verify your email.',
        user: { id: 1, email: 'test@example.com' },
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'Password@123', name: 'Test User' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('registered successfully');
    });

    it('returns HTTP 400 Bad Request on service error', async () => {
      const err = new Error('Email already in use');
      err.statusCode = 400;
      authService.signupUser.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', password: 'Password@123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Email already in use');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns HTTP 200 OK with token on valid credentials', async () => {
      authService.loginUser.mockResolvedValue({
        user: { id: 1, email: 'user@example.com', role: 'admin' },
        token: 'mock_jwt_token',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'Password@123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBe('mock_jwt_token');
    });

    it('returns HTTP 401 Unauthorized on invalid password', async () => {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      authService.loginUser.mockRejectedValue(err);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'WrongPassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('returns HTTP 200 on successful password reset', async () => {
      const futureDate = new Date(Date.now() + 100000);
      db.query
        .mockResolvedValueOnce({ rows: [{ token: 'valid_token', user_id: 1, expires_at: futureDate }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid_token', newPassword: 'NewPassword@123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password reset successful');
    });
  });
});
