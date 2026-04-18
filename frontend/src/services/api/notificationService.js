import api from '../../utils/api';

const notificationService = {
  getMyNotifications: async () => {
    const response = await api.get('/api/notifications/');
    return response.data;
  },

  getNotificationDetails: async (id) => {
    const response = await api.get(`/api/notifications/${id}`);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/api/notifications/${id}/read`, {});
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/api/notifications/read-all', {});
    return response.data;
  },
};

export default notificationService;
