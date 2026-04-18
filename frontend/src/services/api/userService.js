import api from '../../utils/api';

const userService = {
  getMyProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/users/profile', data);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('imageUrl', file);
    const response = await api.post('/api/users/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPublicProfile: async (email) => {
    const response = await api.get(`/api/users/public/${email}`);
    return response.data;
  },

  getReputation: async (email) => {
    const response = await api.get(`/api/users/reputation/${email}`);
    return response.data;
  },

  getReputationHistory: async (email) => {
    const response = await api.get(`/api/users/reputation/${email}/history`);
    return response.data;
  },

  getAllUsersForChat: async () => {
    const response = await api.get('/api/users/chat-users');
    return response.data;
  },
};

export { userService };
export default userService;
