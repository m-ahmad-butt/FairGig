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
  const [resendTimer, setResendTimer] = useState(0);
  const email = location.state?.email;
  const role = location.state?.role;

  useEffect(() => {
    if (!email) {
      toast.error('Email not found. Please register again.');
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

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
        setTimeout(() => navigate('/login'), 2000);
      } else {
        navigate('/pending-approval', { state: { email, role } });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setResending(true);

    try {
      const result = await authService.resendOTP(email);
      toast.success(result.message);
      setResendTimer(60);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Verify Email</h2>
          <p className="text-gray-500">Code sent to <span className="text-black font-medium">{email}</span></p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-gray-100 border-none text-center text-3xl tracking-[1em] py-4 rounded-xl focus:ring-2 focus:ring-black font-mono"
            placeholder="000000"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={handleResendOTP}
            disabled={resendTimer > 0 || resending}
            className="text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>

        <div className="text-center">
          <Link to="/register" className="text-gray-400 hover:text-black text-sm">
            Back to registration
          </Link>
        </div>
      </div>
    </div>
  );
}