const { normalizeText } = require('../middleware/validation');
const { toWorkerAlias } = require('../utils/helpers');
const { serializeComment } = require('../utils/serializer');
const commentRepository = require('../repositories/commentRepository');
const { getPostForAccess } = require('./communityPostController');

async function listComments(req, res) {
  try {
    const post = await getPostForAccess(req, res);
    if (!post) return;

    const comments = await commentRepository.findCommentsByPostId(post.id);

    return res.json({
      count: comments.length,
      comments: comments.map((comment) => serializeComment(comment, req.user.userId))
    });
  } catch (error) {
    console.error('List comments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createComment(req, res) {
  try {
    const { postId } = req.params;
    const content = normalizeText(req.body.content);

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment must be 1000 characters or less' });
    }

    const post = await getPostForAccess(req, res);
    if (!post) return;

    const comment = await commentRepository.createComment({
      post_id: postId,
      author_id: req.user.userId,
      author_alias: toWorkerAlias(req.user.userId),
      content
    });

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        ...serializeComment(comment, req.user.userId),
        is_owner: true
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listComments,
  createComment
};
