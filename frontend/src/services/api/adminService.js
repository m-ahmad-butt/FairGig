import api from '../../utils/api';

const adminService = {
  getAllUsers: async (page, limit) => {
    const response = await api.get(`/api/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  toggleBanUser: async (email, isBan) => {
    const response = await api.patch('/api/admin/ban-user', { email, isBan });
    return response.data;
  },

  getAdminNotifications: async () => {
    const response = await api.get('/api/admin/notifications');
    return response.data;
  },
};

export default adminService;
