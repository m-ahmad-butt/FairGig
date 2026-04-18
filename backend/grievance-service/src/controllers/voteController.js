const { VOTE_DIRECTION } = require('../config/constants');
const { normalizeText } = require('../middleware/validation');
const voteRepository = require('../repositories/voteRepository');
const { getPostForAccess } = require('./communityPostController');

async function voteOnPost(req, res) {
  try {
    const { postId } = req.params;
    const direction = normalizeText(req.body.direction).toLowerCase();

    if (![VOTE_DIRECTION.UP, VOTE_DIRECTION.DOWN].includes(direction)) {
      return res.status(400).json({ error: 'direction must be either up or down' });
    }

    const post = await getPostForAccess(req, res);
    if (!post) return;

    const existingVote = await voteRepository.findVoteByPostAndWorker(postId, req.user.userId);

    if (existingVote && existingVote.direction === direction) {
      await voteRepository.deleteVote(existingVote.id);
    } else if (existingVote) {
      await voteRepository.updateVote(existingVote.id, { direction });
    } else {
      await voteRepository.createVote({
        post_id: postId,
        worker_id: req.user.userId,
        direction
      });
    }

    const summary = await voteRepository.getVoteSummary(postId, req.user);

    return res.json({
      message: 'Vote updated successfully',
      ...summary
    });
  } catch (error) {
    console.error('Vote post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  voteOnPost
};
