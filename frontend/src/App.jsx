import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/Landing/LandingPage';
import RegisterPage from './pages/Auth/RegisterPage';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import VerifyOtpPage from './pages/Auth/VerifyOtpPage';
import PendingApprovalPage from './pages/Auth/PendingApprovalPage';
import OnboardingPage from './pages/Auth/OnboardingPage';
import WorkerDashboard from './pages/Dashboard/WorkerDashboard';
import VerifierDashboard from './pages/Dashboard/VerifierDashboard';
import VerificationDetail from './pages/Dashboard/VerificationDetail';
import AdvocateDashboard from './pages/Dashboard/AdvocateDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProfilePage from './pages/Profile/ProfilePage';
import WorkerCommunityPage from './pages/Community/WorkerCommunityPage';
import EarningsLogPage from './pages/Earnings/EarningsLogPage';
import IncomeAnalyticsPage from './pages/Earnings/IncomeAnalyticsPage';
import IncomeCertificatePage from './pages/Earnings/IncomeCertificatePage';

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
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        
        {/* Dashboards */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/worker/profile" element={<ProfilePage />} />
        <Route path="/verifier/profile" element={<ProfilePage />} />
        <Route path="/analyst/profile" element={<ProfilePage />} />
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />
        <Route path="/worker/log-earnings" element={<EarningsLogPage />} />
        <Route path="/worker/analytics" element={<IncomeAnalyticsPage />} />
        <Route path="/worker/certificate" element={<IncomeCertificatePage />} />
        <Route path="/worker/community" element={<WorkerCommunityPage />} />
        <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
        <Route path="/verifier/verification/:id" element={<VerificationDetail />} />
        <Route path="/analyst/dashboard" element={<AdvocateDashboard />} />
        <Route path="/advocate/dashboard" element={<AdvocateDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
