const express = require('express');
const { ROLES } = require('../config/constants');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const communityPostController = require('../controllers/communityPostController');
const commentController = require('../controllers/commentController');
const voteController = require('../controllers/voteController');

const router = express.Router();

router.get(
  '/posts',
  authenticateToken,
  requireRoles([ROLES.WORKER, ROLES.ADVOCATE, ROLES.ADMIN]),
  communityPostController.listPosts
);

router.get(
  '/posts/top',
  authenticateToken,
  requireRoles([ROLES.WORKER, ROLES.ADVOCATE, ROLES.ADMIN]),
  communityPostController.listTopPosts
);

router.get(
  '/posts/clusters',
  authenticateToken,
  requireRoles([ROLES.WORKER, ROLES.ADVOCATE, ROLES.ADMIN]),
  communityPostController.listPostClusters
);

router.post(
  '/posts',
  authenticateToken,
  requireRoles([ROLES.WORKER]),
  communityPostController.createPost
);

router.get(
  '/posts/:postId/comments',
  authenticateToken,
  requireRoles([ROLES.WORKER, ROLES.ADVOCATE, ROLES.ADMIN]),
  commentController.listComments
);

router.post(
  '/posts/:postId/comments',
  authenticateToken,
  requireRoles([ROLES.WORKER]),
  commentController.createComment
);

router.post(
  '/posts/:postId/vote',
  authenticateToken,
  requireRoles([ROLES.WORKER]),
  voteController.voteOnPost
);

module.exports = router;
