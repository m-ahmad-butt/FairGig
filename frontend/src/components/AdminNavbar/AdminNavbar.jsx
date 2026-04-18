import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/admin/listings', label: 'Listings', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { path: '/admin/comments', label: 'Comments', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  ];

  return (
    <nav className="px-6 lg:px-12 py-4 bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => navigate('/admin')} 
          className="group flex items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
            <span className="text-white text-xl font-black">A</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-2xl font-black tracking-tight">ADMIN</span>
            <span className="text-2xl font-light text-gray-400 italic">Panel</span>
          </div>
        </button>
        
        {/* Navigation Pills */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-50/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                isActive(item.path)
                  ? 'bg-white text-black shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span>{item.label}</span>
              {isActive(item.path) && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Back to Site */}
          <button
            onClick={() => navigate('/home')}
            className="bg-gray-50 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all duration-300 flex items-center gap-2 border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to Site</span>
          </button>

          {/* Profile */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              {user?.imageUrl ? (
                <img src={user.imageUrl} className="w-full h-full object-cover rounded-lg" alt="profile" />
              ) : (
                <span className="text-white text-sm font-black">{(user?.name || 'A').charAt(0)}</span>
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-black text-black">{user?.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
