import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/landing';
import RegisterPage from './pages/register';
import LoginPage from './pages/login';
import ForgotPasswordPage from './pages/forgotPassword';
import VerifyOtpPage from './pages/verifyOtp';
import ProfilePage from './pages/profile';
import OtherProfilePage from './pages/otherProfile';
import UploadImagePage from './pages/uploadImage';
import MessagesPage from './pages/messages';
import DiscussionRoomsPage from './pages/discussionRooms';
import DiscussionTopicsPage from './pages/discussionTopics';
import DiscussionMessagesPage from './pages/discussionMessages';
import PaymentsPage from './pages/payments';
import CheckoutPage from './pages/checkout';
import PaymentSuccessPage from './pages/paymentSuccess';
import PaymentFailedPage from './pages/paymentFailed';
import TransactionsPage from './pages/transactions';
import TransactionDetailPage from './pages/transactionDetail';
import NotificationsPage from './pages/notifications';
import NotificationDetailPage from './pages/notificationDetail';
import AdminPage from './pages/admin';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />

        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:email" element={<ProtectedRoute><OtherProfilePage /></ProtectedRoute>} />
        <Route path="/profile/upload-image" element={<ProtectedRoute><UploadImagePage /></ProtectedRoute>} />
        
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/messages/:chatId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

        <Route path="/discussions" element={<ProtectedRoute><DiscussionRoomsPage /></ProtectedRoute>} />
        <Route path="/discussions/rooms/:roomId" element={<ProtectedRoute><DiscussionTopicsPage /></ProtectedRoute>} />
        <Route path="/discussions/topics/:topicId" element={<ProtectedRoute><DiscussionMessagesPage /></ProtectedRoute>} />

        <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
        <Route path="/payments/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/payments/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
        <Route path="/payments/failed" element={<ProtectedRoute><PaymentFailedPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetailPage /></ProtectedRoute>} />
        
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/notifications/:id" element={<ProtectedRoute><NotificationDetailPage /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
