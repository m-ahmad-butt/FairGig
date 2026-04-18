import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  rooms: [],
  currentRoom: null,
  topics: [],
  currentTopic: null,
  messages: [],
  loading: false,
  error: null,
};

const discussionsSlice = createSlice({
  name: 'discussions',
  initialState,
  reducers: {
    setRooms: (state, action) => {
      state.rooms = action.payload;
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    setTopics: (state, action) => {
      state.topics = action.payload;
    },
    setCurrentTopic: (state, action) => {
      state.currentTopic = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setRooms, setCurrentRoom, setTopics, setCurrentTopic, setMessages, addMessage, setLoading, setError, clearError } = discussionsSlice.actions;
export default discussionsSlice.reducer;
