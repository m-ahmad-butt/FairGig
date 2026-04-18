import api from '../../utils/api';

const discussionService = {
  createRoom: async (data) => {
    const response = await api.post('/api/discussions/rooms', data);
    return response.data;
  },

  getAllPublicRooms: async () => {
    const response = await api.get('/api/discussions/rooms');
    return response.data;
  },

  joinPrivateRoom: async (codeOrRoomId, code) => {
    if (code) {
      const response = await api.post(`/api/discussions/rooms/${codeOrRoomId}/join`, { code });
      return response.data;
    } else if (codeOrRoomId && codeOrRoomId.length === 8) {
      const response = await api.post('/api/discussions/rooms/join', { code: codeOrRoomId });
      return response.data;
    } else {
      const response = await api.post(`/api/discussions/rooms/${codeOrRoomId}/join`, {});
      return response.data;
    }
  },

  getRoomDetails: async (roomId) => {
    const response = await api.get(`/api/discussions/rooms/${roomId}`);
    return response.data;
  },

  createTopic: async (data) => {
    const response = await api.post('/api/discussions/topics', data);
    return response.data;
  },

  getTopicsInRoom: async (roomId) => {
    const response = await api.get(`/api/discussions/rooms/${roomId}/topics`);
    return response.data;
  },

  joinPrivateTopic: async (topicId, code) => {
    if (topicId && code) {
      const response = await api.post(`/api/discussions/topics/${topicId}/join`, { code });
      return response.data;
    } else if (code && code.length === 8) {
      const response = await api.post('/api/discussions/topics/join', { code });
      return response.data;
    } else if (topicId) {
      const response = await api.post(`/api/discussions/topics/${topicId}/join`, {});
      return response.data;
    } else {
      throw new Error('Either topicId or code is required');
    }
  },

  getTopicDetails: async (topicId) => {
    const response = await api.get(`/api/discussions/topics/${topicId}`);
    return response.data;
  },

  sendDiscussionMessage: async (topicId, content, isAnonymous) => {
    const response = await api.post(`/api/discussions/topics/${topicId}/messages`, { content, isAnonymous });
    return response.data;
  },

  getDiscussionMessages: async (topicId) => {
    const response = await api.get(`/api/discussions/topics/${topicId}/messages`);
    return response.data;
  },
};

export default discussionService;
