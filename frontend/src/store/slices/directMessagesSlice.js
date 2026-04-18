import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  error: null,
};

const directMessagesSlice = createSlice({
  name: 'directMessages',
  initialState,
  reducers: {
    setChats: (state, action) => {
      state.chats = Array.isArray(action.payload) ? action.payload : [];
    },
    setCurrentChat: (state, action) => {
      state.currentChat = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = Array.isArray(action.payload) ? action.payload : [];
    },
    addMessage: (state, action) => {
      if (Array.isArray(state.messages)) {
        state.messages.push(action.payload);
      } else {
        state.messages = [action.payload];
      }
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

export const { setChats, setCurrentChat, setMessages, addMessage, setLoading, setError, clearError } = directMessagesSlice.actions;
export default directMessagesSlice.reducer;
