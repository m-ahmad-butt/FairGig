import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  verifyOTP: (data) => api.post('/api/auth/verify-otp', data),
  login: (data) => api.post('/api/auth/login', data),
  getToken: (data) => api.post('/api/auth/token', data),
  checkEmail: (data) => api.post('/api/auth/check-email', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),
};

export const userAPI = {
  getProfile: () => api.get('/api/users/profile'),
  getPublicProfile: (email) => api.get(`/api/users/public/${email}`),
  updateProfile: (data) => api.put('/api/users/profile', data),
  uploadProfileImage: (formData) => api.post('/api/users/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAllUsers: () => api.get('/api/users/chat-users'),
};

export const messageAPI = {
  getAllChats: () => api.get('/api/messages/chats'),
  createOrFetchChat: (data) => api.post('/api/messages/chats', data),
  getChatById: (chatId) => api.get(`/api/messages/chats/${chatId}`),
  sendMessage: (chatId, data) => api.post(`/api/messages/chats/${chatId}`, data),
};

export const discussionAPI = {
  createRoom: (data) => api.post('/api/discussions/rooms', data),
  getAllPublicRooms: () => api.get('/api/discussions/rooms'),
  joinPrivateRoom: (roomId, data) => api.post(`/api/discussions/rooms/${roomId}/join`, data),
  getRoomDetails: (roomId) => api.get(`/api/discussions/rooms/${roomId}`),
  createTopic: (data) => api.post('/api/discussions/topics', data),
  getTopicsInRoom: (roomId) => api.get(`/api/discussions/rooms/${roomId}/topics`),
  joinPrivateTopic: (topicId, data) => api.post(`/api/discussions/topics/${topicId}/join`, data),
  getTopicDetails: (topicId) => api.get(`/api/discussions/topics/${topicId}`),
  sendMessage: (topicId, data) => api.post(`/api/discussions/topics/${topicId}/messages`, data),
};

export const transactionAPI = {
  createPaymentIntent: (data) => api.post('/api/transactions/create-payment-intent', data),
  getMyTransactions: () => api.get('/api/transactions/my'),
  getTransactionById: (id) => api.get(`/api/transactions/${id}`),
};

export const notificationAPI = {
  getAll: () => api.get('/api/notifications'),
  markAllAsRead: () => api.patch('/api/notifications/read-all'),
};

export const adminAPI = {
  toggleBanUser: (email, data) => api.patch(`/api/admin/ban-user`, data),
  verifyListing: (id) => api.patch(`/api/admin/listings/${id}/verify`),
  deleteListing: (id) => api.delete(`/api/admin/listings/${id}`),
  deleteComment: (listingId, commentId) => api.delete(`/api/admin/listings/${listingId}/comments/${commentId}`),
};

export default api;
