import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  adminNotifications: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    setAdminNotifications: (state, action) => {
      state.adminNotifications = action.payload;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    updateUserBanStatus: (state, action) => {
      const user = state.users.find(u => u.email === action.payload.email);
      if (user) {
        user.isBan = action.payload.isBan;
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

export const { setUsers, setAdminNotifications, setPagination, updateUserBanStatus, setLoading, setError, clearError } = adminSlice.actions;
export default adminSlice.reducer;
