import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import {
  WORKER_ROLE,
  CATEGORY_OPTIONS,
  RIDER_TYPE_OPTIONS,
  FREELANCER_TYPE_OPTIONS,
  DEFAULT_PLATFORM_CATALOG,
  getPlatformOptions,
  getDefaultPlatform,
  normalizePlatformCatalog
} from '../../utils/workerProfileOptions';

const ROLES = [
  {
    id: 'worker',
    label: 'Worker',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    description: 'Log shifts, track earnings, generate income reports',
    badge: 'Auto-approved'
  },
  {
    id: 'verifier',
    label: 'Verifier',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Review screenshots, approve or dispute earnings records',
    badge: 'Requires approval'
  },
  {
    id: 'analyst',
    label: 'Advocate',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    description: 'Monitor trends, aggregate data, manage grievances',
    badge: 'Requires approval'
  }
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [platformCatalog, setPlatformCatalog] = useState(DEFAULT_PLATFORM_CATALOG);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: WORKER_ROLE,
    category: 'rider',
    platform: getDefaultPlatform('rider'),
    vehicleType: RIDER_TYPE_OPTIONS[0].value,
    freelancerType: FREELANCER_TYPE_OPTIONS[0].value
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPlatformCatalog() {
      try {
        const response = await authService.getPlatforms();

        if (!isMounted) {
          return;
        }

        const catalog = normalizePlatformCatalog(response);
        setPlatformCatalog(catalog);
      } catch (error) {
        console.error('Failed to fetch platform options, using fallback:', error);
      }
    }

    loadPlatformCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const platformOptions = useMemo(
    () => getPlatformOptions(formData.category, platformCatalog),
    [formData.category, platformCatalog]
  );

  useEffect(() => {
    if (formData.role !== WORKER_ROLE) {
      return;
    }

    if (platformOptions.some((option) => option.value === formData.platform)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      platform: platformOptions[0]?.value || ''
    }));
  }, [formData.role, formData.platform, platformOptions]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleSelect = (roleId) => {
    setFormData((prev) => ({ ...prev, role: roleId }));
  };

  const handleCategoryChange = (category) => {
    const nextPlatformOptions = getPlatformOptions(category, platformCatalog);

    setFormData((prev) => ({
      ...prev,
      category,
      platform: nextPlatformOptions[0]?.value || '',
      vehicleType: RIDER_TYPE_OPTIONS[0].value,
      freelancerType: FREELANCER_TYPE_OPTIONS[0].value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.role === WORKER_ROLE) {
      if (!formData.category || !formData.platform) {
        toast.error('Please select worker category and platform');
        return;
      }

      if (formData.category === 'rider' && !formData.vehicleType) {
        toast.error('Please select vehicle type for rider category');
        return;
      }

      if (formData.category === 'freelance' && !formData.freelancerType) {
        toast.error('Please select freelancer type');
        return;
      }
    }

    setLoading(true);

    try {
      const { name, email, password, role, category, platform, vehicleType, freelancerType } = formData;
      const payload = { name, email, password, role };

      if (role === WORKER_ROLE) {
        payload.category = category;
        payload.platform = platform;

        if (category === 'rider') {
          payload.vehicleType = vehicleType;
        }

        if (category === 'freelance') {
          payload.freelancerType = freelancerType;
        }
      }

      const result = await authService.signup(payload);

      toast.success(result.message);
      navigate('/verify-otp', { state: { email, role } });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = formData.category === 'rider' ? RIDER_TYPE_OPTIONS : FREELANCER_TYPE_OPTIONS;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-gray-600">Join FairGig</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="Zeeshan Rana"
            />
          </div>

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
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select your role
            </label>
            <div className="grid gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={`flex items-start p-4 rounded-lg border-2 text-left transition-all ${
                    formData.role === role.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    formData.role === role.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {role.icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{role.label}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {role.badge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
                  </div>
                  {formData.role === role.id && (
                    <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {formData.role === WORKER_ROLE && (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Worker Category
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map((categoryOption) => (
                    <button
                      key={categoryOption.value}
                      type="button"
                      onClick={() => handleCategoryChange(categoryOption.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        formData.category === categoryOption.value
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {categoryOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  id="platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                >
                  {platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.category === 'rider' ? (
                <div>
                  <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="freelancerType" className="block text-sm font-medium text-gray-700 mb-1">
                    Freelancer Type
                  </label>
                  <select
                    id="freelancerType"
                    name="freelancerType"
                    value={formData.freelancerType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

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
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="Confirm password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}