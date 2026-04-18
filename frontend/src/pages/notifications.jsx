import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setNotifications, markAllAsRead, setLoading, setError } from '../store/slices/notificationsSlice';
import Navbar from '../components/Navbar/Navbar';
import notificationService from '../services/api/notificationService';
import toast from 'react-hot-toast';

function NotificationsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { notifications, loading, unreadCount } = useSelector((state) => state.notifications);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      dispatch(setLoading(true));
      const response = await notificationService.getMyNotifications();
      dispatch(setNotifications(response));
    } catch (error) {
      toast.error('Failed to load notifications');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch(markAllAsRead());
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filteredNotifications]);

  const notificationsByType = useMemo(() => {
    const types = {};
    sortedNotifications.forEach(notification => {
      const type = notification.type || 'other';
      if (!types[type]) {
        types[type] = [];
      }
      types[type].push(notification);
    });
    return types;
  }, [sortedNotifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3.293 3.293 3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        );
      case 'abuse':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'reputation':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-600';
      case 'abuse':
        return 'bg-red-100 text-red-600';
      case 'reputation':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Notifications</h1>
            <p className="text-gray-500 font-medium">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-black text-white px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              Mark All Read
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              filter === 'all' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              filter === 'unread' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-medium">Loading notifications...</p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
            <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-2xl font-black mb-2">No notifications</h3>
            <p className="text-gray-400 font-medium">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => navigate(`/notifications/${notification.id}`)}
                className={`bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer ${
                  !notification.isRead ? 'border-l-4 border-l-black' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-black">{notification.title}</h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-black rounded-full flex-shrink-0 mt-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full font-bold uppercase">
                        {notification.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default NotificationsPage;
