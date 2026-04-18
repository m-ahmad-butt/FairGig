import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import FairGigLogo from '../Brand/FairGigLogo';

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedRole = String(user?.role || '').toLowerCase();

  const dashboardPath =
    normalizedRole === 'admin'
      ? '/admin/dashboard'
      : normalizedRole === 'worker'
        ? '/worker/dashboard'
        : normalizedRole === 'verifier'
          ? '/verifier/dashboard'
          : '/analyst/dashboard';

  const profilePath =
    normalizedRole === 'worker'
      ? '/worker/profile'
      : normalizedRole === 'verifier'
        ? '/verifier/profile'
        : '/analyst/profile';

  const navItems = [
    { to: dashboardPath, label: 'Dashboard' },
    { to: profilePath, label: 'Profile' }
  ];

  if (normalizedRole === 'worker') {
    navItems.push({ to: '/worker/log-earnings', label: 'Earnings' });
    navItems.push({ to: '/worker/community', label: 'Community' });
  }

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <nav className="border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to={dashboardPath} className="inline-flex items-center" aria-label="FairGig dashboard">
              <FairGigLogo
                size={34}
                wordmarkClassName="hidden text-xl font-bold tracking-tight text-zinc-900 sm:inline-block"
              />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-sm text-zinc-500 lg:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
