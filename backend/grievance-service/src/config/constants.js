const ROLES = {
  WORKER: 'worker',
  ADVOCATE: 'advocate',
  ANALYST: 'analyst',
  ADMIN: 'admin'
};

const COMMUNITY_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const VOTE_DIRECTION = {
  UP: 'up',
  DOWN: 'down'
};

const MAX_IMAGE_URL_LENGTH = 2 * 1024 * 1024;

module.exports = {
  ROLES,
  COMMUNITY_STATUS,
  VOTE_DIRECTION,
  MAX_IMAGE_URL_LENGTH
};
