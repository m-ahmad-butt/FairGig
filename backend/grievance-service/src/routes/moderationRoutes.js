const express = require('express');
const { ROLES } = require('../config/constants');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const moderationController = require('../controllers/moderationController');

const router = express.Router();

router.get(
  '/posts',
  authenticateToken,
  requireRoles([ROLES.ADVOCATE, ROLES.ANALYST, ROLES.ADMIN]),
  moderationController.listModerationQueue
);

router.patch(
  '/posts/:postId',
  authenticateToken,
  requireRoles([ROLES.ADVOCATE, ROLES.ANALYST, ROLES.ADMIN]),
  moderationController.moderatePost
);

module.exports = router;
