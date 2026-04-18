const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/auth`
  : 'https://s-api-gateway.duckdns.org/api/auth';

class AuthService {
  async signup(data) {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Signup failed');
    }

    return result;
  }

  async verifyOTP(email, otp) {
    const response = await fetch(`${API_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'OTP verification failed');
    }

    return result;
  }

  async resendOTP(email) {
    const response = await fetch(`${API_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to resend OTP');
    }

    return result;
  }

  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    // Store tokens
    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      try {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async getMe() {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      throw new Error('No access token');
    }

    const response = await fetch(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get user info');
    }

    return result;
  }

  async getPlatforms(category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';

    const response = await fetch(`${API_URL}/platforms${query}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch platforms');
    }

    return result;
  }

  async getOnPlatformWorkers(workerId) {
    const query = workerId ? `?worker_id=${encodeURIComponent(workerId)}` : '';

    const response = await fetch(`${API_URL}/workers/on-platform${query}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch on-platform workers');
    }

    return result;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Token refresh failed');
    }

    localStorage.setItem('accessToken', result.accessToken);
    return result;
  }

  async updateProfile(updateData) {
    const accessToken = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update profile');
    }

    if (result.user) {
      const currentUser = this.getUser();
      const updatedUser = { ...currentUser, ...result.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return result;
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }

  // Admin endpoints
  async getPendingUsers() {
    const accessToken = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/admin/pending-users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get pending users');
    }

    return result;
  }

  async approveUser(userId) {
    const accessToken = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/admin/approve-user/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to approve user');
    }

    return result;
  }

  async rejectUser(userId) {
    const accessToken = localStorage.getItem('accessToken');

    const response = await fetch(`${API_URL}/admin/reject-user/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to reject user');
    }

    return result;
  }
}

export default new AuthService();
