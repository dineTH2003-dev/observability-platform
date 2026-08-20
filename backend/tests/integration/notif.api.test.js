/**
 * API Integration Tests — /api/notifications
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/notification.service', () => ({
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const notificationService = require('../../src/services/notification.service');
const db = require('../../src/config/db');

describe('API Integration — /api/notifications Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/notifications — returns user notifications', async () => {
    notificationService.getUserNotifications.mockResolvedValue([{ id: 1, message: 'New Incident' }]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, message: 'New Incident' }]);
  });

  it('GET /api/notifications/unread-count — returns badge count', async () => {
    notificationService.getUnreadCount.mockResolvedValue(3);

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ count: 3 });
  });

  it('PATCH /api/notifications/read-all — bulk marks all notifications as read', async () => {
    notificationService.markAllAsRead.mockResolvedValue(5);

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ updated: 5 });
  });
});
