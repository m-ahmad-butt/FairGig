import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  publicProfile: null,
  reputation: null,
  reputationHistory: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setPublicProfile: (state, action) => {
      state.publicProfile = action.payload;
    },
    setReputation: (state, action) => {
      state.reputation = action.payload;
    },
    setReputationHistory: (state, action) => {
      state.reputationHistory = action.payload;
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

export const { setProfile, setPublicProfile, setReputation, setReputationHistory, setLoading, setError, clearError } = userSlice.actions;
export default userSlice.reducer;
