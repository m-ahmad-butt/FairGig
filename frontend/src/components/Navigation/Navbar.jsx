import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'worker'
        ? '/worker/dashboard'
        : user?.role === 'verifier'
          ? '/verifier/dashboard'
          : '/analyst/dashboard';

  const profilePath =
    user?.role === 'worker'
      ? '/worker/profile'
      : user?.role === 'verifier'
        ? '/verifier/profile'
        : '/analyst/profile';

  const navItems = [
    { to: dashboardPath, label: 'Dashboard' },
    { to: profilePath, label: 'Profile' }
  ];

  if (user?.role === 'worker') {
    navItems.push({ to: '/worker/community', label: 'Community' });
  }

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to={dashboardPath} className="text-xl font-bold text-gray-900">
              FairGig
            </Link>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.to
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
