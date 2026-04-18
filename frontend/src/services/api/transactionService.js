import api from '../../utils/api';

const transactionService = {
  createPaymentIntent: async (amount, description, token) => {
    // The token is already handled by the axios interceptor, so we don't need to manually set it
    const response = await api.post('/api/transactions/create-payment-intent', { amount, description });
    return response.data;
  },

  verifyPayment: async (sessionId) => {
    const response = await api.get(`/api/transactions/verify-payment/${sessionId}`);
    return response.data;
  },

  getMyTransactions: async () => {
    const response = await api.get('/api/transactions/my');
    return response.data;
  },

  getTransactionDetails: async (id) => {
    const response = await api.get(`/api/transactions/${id}`);
    return response.data;
  },
};

export default transactionService;
