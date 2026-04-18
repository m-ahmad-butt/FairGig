const { COMMUNITY_STATUS } = require('../config/constants');
const { normalizeText, isObjectId } = require('../middleware/validation');
const { serializeCommunityPost } = require('../utils/serializer');
const postRepository = require('../repositories/communityPostRepository');

async function listModerationQueue(req, res) {
  try {
    const status = normalizeText(req.query.status).toLowerCase();
    const where = Object.values(COMMUNITY_STATUS).includes(status)
      ? { status }
      : { status: COMMUNITY_STATUS.PENDING };

    const posts = await postRepository.findManyPosts(where);

    return res.json({
      count: posts.length,
      posts: posts.map((post) => serializeCommunityPost(post, req.user))
    });
  } catch (error) {
    console.error('Moderation queue error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function moderatePost(req, res) {
  try {
    const { postId } = req.params;
    const status = normalizeText(req.body.status).toLowerCase();
    const moderation_note = normalizeText(req.body.moderation_note || '');

    if (!isObjectId(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    if (![COMMUNITY_STATUS.APPROVED, COMMUNITY_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const post = await postRepository.updatePost(postId, {
      status,
      moderation_note: moderation_note || null,
      moderated_by: req.user.userId,
      moderated_at: new Date()
    });

    return res.json({
      message: `Post ${status} successfully`,
      post: serializeCommunityPost(post, req.user)
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }

    console.error('Moderate post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listModerationQueue,
  moderatePost
};
