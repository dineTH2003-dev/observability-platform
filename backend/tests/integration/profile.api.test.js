/**
 * API Integration Tests — /api/profile
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/profile.service', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  deleteProfile: jest.fn(),
}));

jest.mock('../../src/validators/profileValidator', () => ({
  validateAvatarFile: jest.fn(),
  validatePasswordChange: jest.fn((body) => body),
  validateProfileUpdate: jest.fn((body) => body),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const profileService = require('../../src/services/profile.service');
const db = require('../../src/config/db');

describe('API Integration — /api/profile Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/profile — returns user profile', async () => {
    profileService.getProfile.mockResolvedValue({ id: 1, name: 'Alice' });

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alice');
  });

  it('PUT /api/profile — updates profile data', async () => {
    profileService.updateProfile.mockResolvedValue({ id: 1, name: 'Alice Updated' });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Alice Updated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile updated successfully');
  });
});
