import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import authService from '../services/api/authService';
import toast from 'react-hot-toast';

function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.verifyOtp({ email, otp });
      dispatch(setCredentials({ user: response.user, token: response.token }));
      toast.success('Email verified successfully');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await authService.sendOtp(email);
      toast.success('OTP sent to your email');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl p-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">Verify Email</h1>
        <p className="text-gray-500 font-medium mb-8">
          Enter the 6-digit code sent to {email}
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-center text-2xl font-black tracking-widest"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-black text-white py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-bold text-gray-600 hover:text-black transition-colors disabled:text-gray-400"
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold text-gray-600 hover:text-black transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtpPage;
