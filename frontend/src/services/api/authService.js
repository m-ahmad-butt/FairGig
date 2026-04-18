const API_URL = import.meta.env.API_GATEWAY_URL || 'http://localhost:8080';

const fetchWithJson = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignored
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

const authService = {
  register: async (data) => {
    try {
      return await fetchWithJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('[AuthService] Register API error:', error.message);
      throw error;
    }
  },

  login: async (data) => {
    try {
      return await fetchWithJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('[AuthService] Login API error:', error.message);
      throw error;
    }
  },

  verifyOtp: async (data) => {
    try {
      return await fetchWithJson('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('[AuthService] Verify OTP API error:', error.message);
      throw error;
    }
  },

  sendOtp: async (email) => {
    try {
      return await fetchWithJson('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error('[AuthService] Send OTP API error:', error.message);
      throw error;
    }
  },

  changePassword: async (data, token) => {
    try {
      return await fetchWithJson('/api/auth/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('[AuthService] Change password API error:', error.message);
      throw error;
    }
  },
};

export default authService;
