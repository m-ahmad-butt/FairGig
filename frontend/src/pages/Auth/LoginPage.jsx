import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import { isWorkerProfileComplete } from '../../utils/workerProfileOptions';
import FairGigLogo from '../../components/Brand/FairGigLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getDashboardPath = (role) => {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'admin') {
      return '/admin/dashboard';
    }

    if (normalizedRole === 'worker') {
      return '/worker/dashboard';
    }

    if (normalizedRole === 'verifier') {
      return '/verifier/dashboard';
    }

    if (normalizedRole === 'analyst' || normalizedRole === 'advocate') {
      return '/analyst/dashboard';
    }

    return '/profile';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authService.login(formData.email, formData.password);
      
      toast.success(result.message);

      // Check if onboarding is needed
      const user = result.user;
      const isWorkerRole = String(user.role || '').toLowerCase() === 'worker';
      const locationMissing = isWorkerRole && (!user.city || !user.zone);
      const workerProfileMissing = isWorkerRole && !isWorkerProfileComplete(user);
      // Login is only allowed for verified users; treat missing emailVerified as verified.
      const emailNotVerified = user.emailVerified === false;
      const needsOnboarding = isWorkerRole && (emailNotVerified || locationMissing || workerProfileMissing);
      
      if (needsOnboarding) {
        navigate('/onboarding', { state: { email: formData.email, role: user.role } });
      } else {
        navigate(getDashboardPath(user.role));
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <FairGigLogo size={64} showWordmark={false} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-gray-600">Sign in to your FairGig account</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="m.ahmad.software.engineer@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 3l18 18M10.73 5.08A10.45 10.45 0 0112 5c7 0 10 7 10 7a18.83 18.83 0 01-5.06 5.94M9.88 9.88A3 3 0 0014.12 14.12M6.61 6.61A18.74 18.74 0 002 12s3 7 10 7a9.77 9.77 0 004.39-1.02"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M2.46 12C3.73 8.11 7.23 5 12 5c4.77 0 8.27 3.11 9.54 7-1.27 3.89-4.77 7-9.54 7-4.77 0-8.27-3.11-9.54-7z"
                    />
                    <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-black transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-black font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}