const notificationService = require('../services/notification.service');

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const result = await notificationService.getUserNotifications(req.user.userId, req.query);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// GET /api/notifications/unread-count
async function getUnreadCount(req, res) {
  try {
    const count = await notificationService.getUnreadCount(req.user.userId);
    res.json({ count });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res) {
  try {
    const notif = await notificationService.markAsRead(req.params.id, req.user.userId);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// PATCH /api/notifications/read-all
async function markAllAsRead(req, res) {
  try {
    const count = await notificationService.markAllAsRead(req.user.userId);
    res.json({ updated: count });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// DELETE /api/notifications/:id
async function deleteNotification(req, res) {
  try {
    const notif = await notificationService.deleteNotification(req.params.id, req.user.userId);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted', id: notif.id });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
