const { COMMUNITY_STATUS, MAX_IMAGE_URL_LENGTH } = require('../config/constants');
const { normalizeText, isObjectId } = require('../middleware/validation');
const { canModerate } = require('../middleware/auth');
const { toWorkerAlias, canViewPost, buildWorkerVisibilityWhere } = require('../utils/helpers');
const { serializeCommunityPost } = require('../utils/serializer');
const postRepository = require('../repositories/communityPostRepository');
const { clusterCommunityPosts, rankTopPosts } = require('../services/communityClusteringService');

function parsePositiveInt(value, defaultValue, min = 1, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const normalized = Math.trunc(parsed);
  return Math.min(Math.max(normalized, min), max);
}

function parseThreshold(value, defaultValue = 0.35) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

function buildPostsWhere(user, query) {
  const platform = normalizeText(query.platform);
  const issue = normalizeText(query.issue);
  const status = normalizeText(query.status).toLowerCase();
  const validStatus = Object.values(COMMUNITY_STATUS).includes(status) ? status : null;

  const where = canModerate(user)
    ? (validStatus ? { status: validStatus } : {})
    : buildWorkerVisibilityWhere(user, validStatus);

  if (platform) {
    where.platform = platform;
  }

  if (issue) {
    where.issue = issue;
  }

  return where;
}

async function listPosts(req, res) {
  try {
    const sort = normalizeText(req.query.sort || 'new').toLowerCase();
    const where = buildPostsWhere(req.user, req.query);

    const posts = await postRepository.findManyPosts(where);
    const serialized = posts.map((post) => serializeCommunityPost(post, req.user));

    if (sort === 'top') {
      serialized.sort((a, b) => (b.score - a.score) || (new Date(b.created_at) - new Date(a.created_at)));
    } else if (sort === 'controversial') {
      serialized.sort((a, b) => {
        const aControversy = Math.min(a.upvotes, a.downvotes);
        const bControversy = Math.min(b.upvotes, b.downvotes);
        return (bControversy - aControversy) || (new Date(b.created_at) - new Date(a.created_at));
      });
    }

    return res.json({
      count: serialized.length,
      posts: serialized
    });
  } catch (error) {
    console.error('List community posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPost(req, res) {
  try {
    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const platform = normalizeText(req.body.platform);
    const issue = normalizeText(req.body.issue);
    const image_url = normalizeText(req.body.image_url || '');

    if (!title || !description || !platform || !issue) {
      return res.status(400).json({ error: 'title, description, platform and issue are required' });
    }

    if (image_url.length > MAX_IMAGE_URL_LENGTH) {
      return res.status(400).json({ error: 'Image payload is too large' });
    }

    const post = await postRepository.createPost({
      author_id: req.user.userId,
      author_alias: toWorkerAlias(req.user.userId),
      title,
      description,
      platform,
      issue,
      image_url: image_url || null,
      status: COMMUNITY_STATUS.PENDING
    });

    return res.status(201).json({
      message: 'Post submitted and awaiting advocate moderation',
      post: serializeCommunityPost(post, req.user)
    });
  } catch (error) {
    console.error('Create community post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listTopPosts(req, res) {
  try {
    const where = buildPostsWhere(req.user, req.query);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const posts = await postRepository.findManyPosts(where);
    const serialized = posts.map((post) => serializeCommunityPost(post, req.user));
    const topPosts = rankTopPosts(serialized, limit);

    return res.json({
      count: topPosts.length,
      limit,
      posts: topPosts
    });
  } catch (error) {
    console.error('List top community posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listPostClusters(req, res) {
  try {
    const where = buildPostsWhere(req.user, req.query);
    const maxClusters = parsePositiveInt(req.query.max_clusters, 50, 1, 100);
    const perClusterTopPosts = parsePositiveInt(req.query.per_cluster_limit, 3, 1, 20);
    const titleSimilarityThreshold = parseThreshold(req.query.title_similarity_threshold, 0.35);

    const posts = await postRepository.findManyPosts(where);
    const serialized = posts.map((post) => serializeCommunityPost(post, req.user));

    const clustered = clusterCommunityPosts(serialized, {
      maxClusters,
      perClusterTopPosts,
      titleSimilarityThreshold
    });

    return res.json(clustered);
  } catch (error) {
    console.error('Cluster community posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPostForAccess(req, res) {
  const { postId } = req.params;

  if (!isObjectId(postId)) {
    res.status(400).json({ error: 'Invalid post id' });
    return null;
  }

  const post = await postRepository.findPostById(postId, {
    id: true,
    author_id: true,
    status: true
  });

  if (!post || !canViewPost(post, req.user)) {
    res.status(404).json({ error: 'Post not found' });
    return null;
  }

  return post;
}

module.exports = {
  listPosts,
  listTopPosts,
  listPostClusters,
  createPost,
  getPostForAccess
};
