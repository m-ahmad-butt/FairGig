const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/pending-users', authenticateToken, isAdmin, adminController.getPendingUsers);
router.post('/approve-user/:userId', authenticateToken, isAdmin, adminController.approveUser);
router.post('/reject-user/:userId', authenticateToken, isAdmin, adminController.rejectUser);

// Public endpoint for one-click approval via email link
router.get('/approve/:token', adminController.approveUserByToken);

module.exports = router;
