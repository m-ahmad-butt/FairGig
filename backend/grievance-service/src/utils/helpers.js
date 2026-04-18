const { COMMUNITY_STATUS } = require('../config/constants');
const { canModerate } = require('../middleware/auth');

function toWorkerAlias(userId) {
  const suffix = String(userId || '').slice(-6).toUpperCase();
  return `Worker-${suffix || 'ANON'}`;
}

function canViewPost(post, user) {
  if (!post) return false;
  if (canModerate(user)) return true;
  if (post.status === COMMUNITY_STATUS.APPROVED) return true;
  return post.author_id === user.userId;
}

function buildWorkerVisibilityWhere(user, statusFilter) {
  if (statusFilter === COMMUNITY_STATUS.PENDING) {
    return {
      author_id: user.userId,
      status: COMMUNITY_STATUS.PENDING
    };
  }

  if (statusFilter === COMMUNITY_STATUS.REJECTED) {
    return {
      author_id: user.userId,
      status: COMMUNITY_STATUS.REJECTED
    };
  }

  if (statusFilter === COMMUNITY_STATUS.APPROVED) {
    return {
      status: COMMUNITY_STATUS.APPROVED
    };
  }

  return {
    OR: [
      { status: COMMUNITY_STATUS.APPROVED },
      { author_id: user.userId }
    ]
  };
}

module.exports = {
  toWorkerAlias,
  canViewPost,
  buildWorkerVisibilityWhere
};
