const { VOTE_DIRECTION } = require('../config/constants');

function serializeCommunityPost(post, currentUser) {
  const votes = Array.isArray(post.votes) ? post.votes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];

  let upvotes = 0;
  let downvotes = 0;
  let user_vote = null;

  for (const vote of votes) {
    if (vote.direction === VOTE_DIRECTION.UP) {
      upvotes += 1;
    }

    if (vote.direction === VOTE_DIRECTION.DOWN) {
      downvotes += 1;
    }

    if (currentUser && vote.worker_id === currentUser.userId) {
      user_vote = vote.direction;
    }
  }

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    platform: post.platform,
    issue: post.issue,
    image_url: post.image_url || null,
    author_alias: post.author_alias,
    status: post.status,
    moderation_note: post.moderation_note || null,
    created_at: post.created_at,
    updated_at: post.updated_at,
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    comment_count: comments.length,
    user_vote,
    is_owner: Boolean(currentUser && post.author_id === currentUser.userId)
  };
}

function serializeComment(comment, currentUserId) {
  return {
    id: comment.id,
    post_id: comment.post_id,
    author_alias: comment.author_alias,
    content: comment.content,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    is_owner: comment.author_id === currentUserId
  };
}

module.exports = {
  serializeCommunityPost,
  serializeComment
};
