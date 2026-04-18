const prisma = require('../config/prisma');
const { VOTE_DIRECTION } = require('../config/constants');

async function findVoteByPostAndWorker(postId, workerId) {
  return prisma.communityVote.findUnique({
    where: {
      post_id_worker_id: {
        post_id: postId,
        worker_id: workerId
      }
    }
  });
}

async function createVote(data) {
  return prisma.communityVote.create({
    data
  });
}

async function updateVote(voteId, data) {
  return prisma.communityVote.update({
    where: { id: voteId },
    data
  });
}

async function deleteVote(voteId) {
  return prisma.communityVote.delete({
    where: { id: voteId }
  });
}

async function getVoteSummary(postId, currentUser) {
  const [upvotes, downvotes] = await Promise.all([
    prisma.communityVote.count({ where: { post_id: postId, direction: VOTE_DIRECTION.UP } }),
    prisma.communityVote.count({ where: { post_id: postId, direction: VOTE_DIRECTION.DOWN } })
  ]);

  let user_vote = null;

  if (currentUser) {
    const vote = await findVoteByPostAndWorker(postId, currentUser.userId);
    user_vote = vote?.direction || null;
  }

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    user_vote
  };
}

module.exports = {
  findVoteByPostAndWorker,
  createVote,
  updateVote,
  deleteVote,
  getVoteSummary
};
