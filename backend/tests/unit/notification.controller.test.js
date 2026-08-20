/**
 * Unit Tests — notification.controller.js
 */

jest.mock('../../src/services/notification.service', () => ({
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

const notificationService = require('../../src/services/notification.service');
const notificationController = require('../../src/controllers/notification.controller');

function makeReqRes(user = { userId: 1 }, query = {}, params = {}) {
  const req = { user, query, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Notification Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getNotifications()', () => {
    it('returns notifications list', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, { limit: 10 });
      notificationService.getUserNotifications.mockResolvedValue([{ id: 1, message: 'Alert' }]);

      await notificationController.getNotifications(req, res);

      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(1, { limit: 10 });
      expect(res.json).toHaveBeenCalledWith([{ id: 1, message: 'Alert' }]);
    });

    it('handles errors', async () => {
      const { req, res } = makeReqRes();
      notificationService.getUserNotifications.mockRejectedValue(new Error('Fetch error'));

      await notificationController.getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Fetch error' });
    });
  });

  describe('getUnreadCount()', () => {
    it('returns unread count object', async () => {
      const { req, res } = makeReqRes({ userId: 1 });
      notificationService.getUnreadCount.mockResolvedValue(5);

      await notificationController.getUnreadCount(req, res);

      expect(notificationService.getUnreadCount).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });

    it('handles errors with custom statusCode', async () => {
      const { req, res } = makeReqRes();
      const err = new Error('Auth error');
      err.statusCode = 401;
      notificationService.getUnreadCount.mockRejectedValue(err);

      await notificationController.getUnreadCount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Auth error' });
    });
  });

  describe('markAsRead()', () => {
    it('marks notification as read successfully', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '10' });
      notificationService.markAsRead.mockResolvedValue({ id: 10, is_read: true });

      await notificationController.markAsRead(req, res);

      expect(notificationService.markAsRead).toHaveBeenCalledWith('10', 1);
      expect(res.json).toHaveBeenCalledWith({ id: 10, is_read: true });
    });

    it('returns 404 if notification is not found', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '99' });
      notificationService.markAsRead.mockResolvedValue(null);

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('handles error in markAsRead', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '10' });
      notificationService.markAsRead.mockRejectedValue(new Error('Update error'));

      await notificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('markAllAsRead()', () => {
    it('marks all notifications as read', async () => {
      const { req, res } = makeReqRes({ userId: 1 });
      notificationService.markAllAsRead.mockResolvedValue(8);

      await notificationController.markAllAsRead(req, res);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ updated: 8 });
    });

    it('handles error in markAllAsRead', async () => {
      const { req, res } = makeReqRes();
      notificationService.markAllAsRead.mockRejectedValue(new Error('Error'));

      await notificationController.markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteNotification()', () => {
    it('deletes a notification', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '12' });
      notificationService.deleteNotification.mockResolvedValue({ id: 12 });

      await notificationController.deleteNotification(req, res);

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('12', 1);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted', id: 12 });
    });

    it('returns 404 if notification to delete is not found', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '999' });
      notificationService.deleteNotification.mockResolvedValue(null);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('handles error in deleteNotification', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { id: '12' });
      notificationService.deleteNotification.mockRejectedValue(new Error('Delete fail'));

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
