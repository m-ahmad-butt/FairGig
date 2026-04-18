const prisma = require('../config/prisma');

async function findManyPosts(where, orderBy = { created_at: 'desc' }) {
  return prisma.communityPost.findMany({
    where,
    include: {
      votes: true,
      comments: { select: { id: true } }
    },
    orderBy
  });
}

async function findPostById(postId, select = null) {
  return prisma.communityPost.findUnique({
    where: { id: postId },
    select: select || undefined
  });
}

async function createPost(data) {
  return prisma.communityPost.create({
    data,
    include: {
      votes: true,
      comments: { select: { id: true } }
    }
  });
}

async function updatePost(postId, data) {
  return prisma.communityPost.update({
    where: { id: postId },
    data,
    include: {
      votes: true,
      comments: { select: { id: true } }
    }
  });
}

module.exports = {
  findManyPosts,
  findPostById,
  createPost,
  updatePost
};
