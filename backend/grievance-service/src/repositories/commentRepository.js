const prisma = require('../config/prisma');

async function findCommentsByPostId(postId) {
  return prisma.communityComment.findMany({
    where: { post_id: postId },
    orderBy: { created_at: 'asc' }
  });
}

async function createComment(data) {
  return prisma.communityComment.create({
    data
  });
}

module.exports = {
  findCommentsByPostId,
  createComment
};
