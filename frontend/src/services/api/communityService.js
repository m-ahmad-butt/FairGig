const AUTH_API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080/api/auth';
const GATEWAY_BASE_URL = AUTH_API_URL.replace(/\/api\/auth\/?$/i, '');
const COMMUNITY_API_URL = `${GATEWAY_BASE_URL}/api/grievance/community`;

function getAuthHeaders() {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Please login again');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${COMMUNITY_API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Request failed');
  }

  return result;
}

class CommunityService {
  async listPosts(params = {}) {
    const query = new URLSearchParams();

    if (params.sort) query.set('sort', params.sort);
    if (params.platform) query.set('platform', params.platform);
    if (params.issue) query.set('issue', params.issue);
    if (params.status) query.set('status', params.status);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/posts${suffix}`);
  }

  async createPost(payload) {
    return request('/posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async votePost(postId, direction) {
    return request(`/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction })
    });
  }

  async listComments(postId) {
    return request(`/posts/${postId}/comments`);
  }

  async addComment(postId, content) {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }
}

export default new CommunityService();
