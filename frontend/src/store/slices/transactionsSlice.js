import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  transactions: [],
  currentTransaction: null,
  paymentIntent: null,
  loading: false,
  error: null,
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    setPaymentIntent: (state, action) => {
      state.paymentIntent = action.payload;
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

export const { setTransactions, setCurrentTransaction, setPaymentIntent, setLoading, setError, clearError } = transactionsSlice.actions;
export default transactionsSlice.reducer;
