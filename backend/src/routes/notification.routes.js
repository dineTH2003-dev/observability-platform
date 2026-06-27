const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notification.controller');

// All routes require authentication
router.get('/',              authenticate, getNotifications);
router.get('/unread-count',  authenticate, getUnreadCount);
router.patch('/read-all',    authenticate, markAllAsRead);
router.patch('/:id/read',    authenticate, markAsRead);
router.delete('/:id',        authenticate, deleteNotification);

module.exports = router;
