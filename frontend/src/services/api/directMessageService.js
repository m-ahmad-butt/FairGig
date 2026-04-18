import api from '../../utils/api';

const directMessageService = {
  getAllChats: async () => {
    const response = await api.get('/api/messages/chats');
    return response.data;
  },

  createOrGetChat: async (otherEmail) => {
    const response = await api.post('/api/messages/chats', { otherUserEmail: otherEmail });
    return response.data;
  },

  getChatById: async (chatId) => {
    const response = await api.get(`/api/messages/chats/${chatId}`);
    return response.data;
  },

  sendMessage: async (chatId, content) => {
    const response = await api.post(`/api/messages/chats/${chatId}`, { content });
    return response.data;
  },
};

export default directMessageService;
