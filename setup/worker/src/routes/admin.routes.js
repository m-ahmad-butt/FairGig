const express = require('express');
const { requireAdmin } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.use(requireAdmin);

router.patch('/users/:email/toggle-ban', adminController.toggleBanUser);
router.patch('/users/:email/promote', adminController.promoteUser);
router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getUserStats);

module.exports = router;