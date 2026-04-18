import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import { isWorkerProfileComplete } from '../../utils/workerProfileOptions';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
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
      const locationMissing = !user.city || !user.zone;
      const workerProfileMissing = !isWorkerProfileComplete(user);
      // Login is only allowed for verified users; treat missing emailVerified as verified.
      const emailNotVerified = user.emailVerified === false;
      const needsOnboarding = emailNotVerified || locationMissing || workerProfileMissing;
      
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
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
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