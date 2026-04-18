import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/Landing/LandingPage';
import RegisterPage from './pages/Auth/RegisterPage';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import VerifyOtpPage from './pages/Auth/VerifyOtpPage';
import PendingApprovalPage from './pages/Auth/PendingApprovalPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AdminDashboard from './pages/Admin/AdminDashboard';

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
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        
        {/* Dashboards */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/worker/dashboard" element={<DashboardPage />} />
        <Route path="/verifier/dashboard" element={<DashboardPage />} />
        <Route path="/analyst/dashboard" element={<DashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
