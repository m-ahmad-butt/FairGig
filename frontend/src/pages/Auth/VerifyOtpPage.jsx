import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = location.state?.email;
  const role = location.state?.role;

  useEffect(() => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      navigate('/register');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.verifyOTP(email, otp);
      
      toast.success(result.message);

      if (result.status === 'active') {
        // Worker - auto approved, redirect to login
        setTimeout(() => navigate('/login'), 2000);
      } else {
        // Verifier/Analyst - pending approval
        navigate('/pending-approval', { state: { email, role } });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);

    try {
      const result = await authService.resendOTP(email);
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Enter OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest sm:text-sm"
              placeholder="000000"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
            
            <div>
              <Link to="/register" className="font-medium text-gray-600 hover:text-gray-500">
                Back to registration
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
