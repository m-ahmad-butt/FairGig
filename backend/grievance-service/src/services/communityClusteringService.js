const TITLE_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were',
  'have', 'has', 'had', 'not', 'but', 'you', 'your', 'our', 'about', 'into',
  'after', 'before', 'when', 'where', 'how', 'why', 'what', 'which', 'who',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'is', 'it'
]);

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function clampNumber(value, defaultValue, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }

  return Math.min(Math.max(numeric, min), max);
}

function tokenizeTitle(title) {
  const normalized = normalizeText(title);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !TITLE_STOP_WORDS.has(token));
}

function toTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function comparePostsByVotes(left, right) {
  const scoreDelta = (right.score || 0) - (left.score || 0);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const upvoteDelta = (right.upvotes || 0) - (left.upvotes || 0);
  if (upvoteDelta !== 0) {
    return upvoteDelta;
  }

  return toTimestamp(right.created_at) - toTimestamp(left.created_at);
}

function rankTopPosts(posts, limit = 10) {
  const normalizedLimit = Math.trunc(clampNumber(limit, 10, 1, 100));
  return [...posts].sort(comparePostsByVotes).slice(0, normalizedLimit);
}

function setJaccardSimilarity(leftSet, rightSet) {
  if (leftSet.size === 0 && rightSet.size === 0) {
    return 1;
  }

  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) {
    return 0;
  }

  let intersectionCount = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) {
      intersectionCount += 1;
    }
  }

  return intersectionCount / union.size;
}

function getStructuralKey(post) {
  const platform = normalizeText(post.platform) || 'unknown';
  const issue = normalizeText(post.issue) || 'unknown';
  const status = normalizeText(post.status) || 'unknown';
  return `${platform}::${issue}::${status}`;
}

function pickTopKeywords(tokenFrequencyMap, limit = 5) {
  return [...tokenFrequencyMap.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function addPostToCluster(cluster, post, tokenSet) {
  cluster.posts.push(post);

  for (const token of tokenSet) {
    cluster.tokens.add(token);
    cluster.tokenFrequency.set(token, (cluster.tokenFrequency.get(token) || 0) + 1);
  }
}

function createClusterSeed(structure, post, tokenSet) {
  const cluster = {
    structure,
    posts: [],
    tokens: new Set(),
    tokenFrequency: new Map()
  };

  addPostToCluster(cluster, post, tokenSet);
  return cluster;
}

function clusterGroupByTitle(posts, titleSimilarityThreshold) {
  const clusters = [];
  const rankedPosts = rankTopPosts(posts, posts.length || 1);

  for (const post of rankedPosts) {
    const tokenSet = new Set(tokenizeTitle(post.title));

    let bestCluster = null;
    let bestSimilarity = -1;

    for (const cluster of clusters) {
      const similarity = setJaccardSimilarity(tokenSet, cluster.tokens);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestSimilarity >= titleSimilarityThreshold) {
      addPostToCluster(bestCluster, post, tokenSet);
      continue;
    }

    clusters.push(createClusterSeed(getStructuralKey(post), post, tokenSet));
  }

  return clusters;
}

function summarizeCluster(cluster, perClusterTopPosts, clusterIndex) {
  const rankedPosts = rankTopPosts(cluster.posts, cluster.posts.length || 1);

  const upvotes = rankedPosts.reduce((sum, post) => sum + (post.upvotes || 0), 0);
  const downvotes = rankedPosts.reduce((sum, post) => sum + (post.downvotes || 0), 0);
  const score = upvotes - downvotes;

  const representative = rankedPosts[0] || null;
  const [platform = 'unknown', issue = 'unknown', status = 'unknown'] = cluster.structure.split('::');

  return {
    cluster_id: `${cluster.structure}::${clusterIndex + 1}`,
    platform,
    issue,
    status,
    post_count: rankedPosts.length,
    representative_title: representative?.title || null,
    keyword_signature: pickTopKeywords(cluster.tokenFrequency, 5),
    vote_summary: {
      upvotes,
      downvotes,
      score
    },
    top_posts: rankTopPosts(rankedPosts, perClusterTopPosts)
  };
}

function clusterCommunityPosts(posts, options = {}) {
  const titleSimilarityThreshold = clampNumber(
    options.titleSimilarityThreshold,
    0.35,
    0,
    1
  );
  const perClusterTopPosts = Math.trunc(
    clampNumber(options.perClusterTopPosts, 3, 1, 20)
  );
  const maxClusters = Math.trunc(clampNumber(options.maxClusters, 50, 1, 100));

  const structuralGroups = new Map();

  for (const post of posts) {
    const key = getStructuralKey(post);
    if (!structuralGroups.has(key)) {
      structuralGroups.set(key, []);
    }
    structuralGroups.get(key).push(post);
  }

  const flattenedClusters = [];

  for (const groupPosts of structuralGroups.values()) {
    const titleClusters = clusterGroupByTitle(groupPosts, titleSimilarityThreshold);
    for (const cluster of titleClusters) {
      flattenedClusters.push(cluster);
    }
  }

  const summarizedClusters = flattenedClusters
    .map((cluster, index) => summarizeCluster(cluster, perClusterTopPosts, index))
    .sort((left, right) => {
      const scoreDelta = right.vote_summary.score - left.vote_summary.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const countDelta = right.post_count - left.post_count;
      if (countDelta !== 0) {
        return countDelta;
      }

      return right.vote_summary.upvotes - left.vote_summary.upvotes;
    })
    .slice(0, maxClusters);

  return {
    total_posts: posts.length,
    cluster_count: summarizedClusters.length,
    title_similarity_threshold: titleSimilarityThreshold,
    clusters: summarizedClusters
  };
}

module.exports = {
  rankTopPosts,
  clusterCommunityPosts
};