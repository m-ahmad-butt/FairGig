const express = require('express');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', notificationController.getAll);
router.get('/:id', notificationController.getById);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.get('/unread-count', notificationController.getUnreadCount);

module.exports = router;