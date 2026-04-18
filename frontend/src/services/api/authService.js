import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authService = {
  register: async (data) => {
    try {
      const response = await axiosInstance.post('/api/auth/register', data);
      return response.data;
    } catch (error) {
      console.error('[AuthService] Register API error:', error.message);
      throw error;
    }
  },

  login: async (data) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', data);
      return response.data;
    } catch (error) {
      console.error('[AuthService] Login API error:', error);
      throw error;
    }
  },

  verifyOtp: async (data) => {
    try {
      const response = await axiosInstance.post('/api/auth/verify-otp', data);
      return response.data;
    } catch (error) {
      console.error('[AuthService] Verify OTP API error:', error);
      throw error;
    }
  },

  sendOtp: async (email) => {
    try {
      const response = await axiosInstance.post('/api/auth/send-otp', { email });
      return response.data;
    } catch (error) {
      console.error('[AuthService] Send OTP API error:', error);
      throw error;
    }
  },

  changePassword: async (data, token) => {
    try {
      const response = await axiosInstance.post('/api/auth/change-password', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('[AuthService] Change password API error:', error);
      throw error;
    }
  },
};

export default authService;
