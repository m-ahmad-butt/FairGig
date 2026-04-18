import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import directMessagesReducer from './slices/directMessagesSlice';
import discussionsReducer from './slices/discussionsSlice';
import transactionsReducer from './slices/transactionsSlice';
import notificationsReducer from './slices/notificationsSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    directMessages: directMessagesReducer,
    discussions: discussionsReducer,
    transactions: transactionsReducer,
    notifications: notificationsReducer,
    admin: adminReducer,
  },
});
