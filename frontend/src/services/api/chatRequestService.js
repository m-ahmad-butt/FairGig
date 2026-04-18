import api from '../../utils/api';

export const chatRequestService = {
  sendRequest: async (to, message = null) => {
    const response = await api.post('/messages/chat-requests', { to, message });
    return response.data;
  },

  getPendingRequests: async () => {
    const response = await api.get('/messages/chat-requests/pending');
    return response.data;
  },

  getSentRequests: async () => {
    const response = await api.get('/messages/chat-requests/sent');
    return response.data;
  },

  approveRequest: async (requestId) => {
    const response = await api.post(`/messages/chat-requests/${requestId}/approve`);
    return response.data;
  },

  rejectRequest: async (requestId) => {
    const response = await api.post(`/messages/chat-requests/${requestId}/reject`);
    return response.data;
  }
};
