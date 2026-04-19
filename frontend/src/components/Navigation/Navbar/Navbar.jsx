import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/notificationsSlice';
import NotificationDropdown from '../NotificationDropdown/NotificationDropdown';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationSocket, setNotificationSocket] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.email || !token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'https://s-api-gateway.duckdns.org';
    const socket = io(API_URL, {
      path: '/socket.io/notifications',
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Notification socket connected');
      socket.emit('join_notifications', user.email);
    });

    socket.on('notification', (notification) => {
      console.log('New notification received:', notification);
      dispatch(addNotification(notification));
      toast.success(notification.title || 'New notification');
    });

    socket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    setNotificationSocket(socket);

    return () => {
      socket.off('notification');
      socket.disconnect();
    };
  }, [user?.email, token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { path: '/messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { path: '/discussions', label: 'Discussions', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
    { path: '/transactions', label: 'Transactions', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { path: '/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' });
  }

  return (
    <nav className={`px-6 lg:px-12 py-4 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg border-b border-gray-100' : 'border-b border-transparent'
      }`}>
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate('/profile')}
          className="group flex items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
            <span className="text-white text-xl font-black">F</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-2xl font-black tracking-tight">FAST</span>
            <span className="text-2xl font-light text-gray-400 italic">-Ex</span>
          </div>
        </button>

        {/* Navigation Pills */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-50/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${isActive(item.path)
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
          {/* Create Listing Button */}
          <button
            onClick={() => navigate('/payments')}
            className="group bg-gradient-to-r from-black to-gray-800 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Funds</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 group"
            >
              <svg className="w-5 h-5 text-gray-700 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-black to-gray-700 flex items-center justify-center border-2 border-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105"
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} className="w-full h-full object-cover" alt="profile" />
              ) : (
                <span className="text-white text-sm font-black">{(user?.name || 'U').charAt(0)}</span>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-14 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                <div className="p-5 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                  <p className="text-base font-black text-gray-900">{user?.name}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{user?.rollNo}</p>
                  <div className="mt-3 flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-black">★</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500">Reputation</p>
                      <p className="text-lg font-black text-gray-900">{user?.reputationScore || 0}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                  className="w-full px-5 py-3 text-left text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-5 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 border-t border-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
