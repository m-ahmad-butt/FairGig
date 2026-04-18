import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setNotifications, markAllAsRead as markAllAsReadAction } from '../../store/slices/notificationsSlice';
import notificationService from '../../services/api/notificationService';
import toast from 'react-hot-toast';

const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { notifications, loading } = useSelector((state) => state.notifications);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getMyNotifications(token);
      dispatch(setNotifications(response));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) {
      return '0 min ago';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'reputation':
        return { bg: 'bg-green-50/50', dot: 'bg-green-500', border: 'border-green-200' };
      case 'abuse':
        return { bg: 'bg-red-50/50', dot: 'bg-red-500', border: 'border-red-200' };
      case 'message':
        return { bg: 'bg-blue-50/50', dot: 'bg-blue-500', border: 'border-blue-200' };
      case 'discussion':
        return { bg: 'bg-purple-50/50', dot: 'bg-purple-500', border: 'border-purple-200' };
      default:
        return { bg: 'bg-gray-50/50', dot: 'bg-gray-500', border: 'border-gray-200' };
    }
  };

  const handleNotificationClick = (notification) => {
    navigate(`/notifications/${notification.id}`);
    onClose();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(token);
      dispatch(markAllAsReadAction());
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  return (
    <div className="absolute right-0 top-14 w-[420px] bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider">Notifications</h3>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest"
          >
            Mark all read
          </button>
        )}
      </div>

      <div 
        className="overflow-y-auto"
        style={{ 
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#9CA3AF #F3F4F6'
        }}
      >
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-gray-400">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm font-medium text-gray-400">No notifications</p>
          </div>
        ) : (
          <>
            {notifications.slice(0, 5).map((notification) => {
              const style = getNotificationStyle(notification.type);
              const isPending = notification.actionType === 'chat_request' && notification.actionStatus === 'pending';
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b ${style.border} hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? style.bg : ''} ${isPending ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.isRead ? style.dot : 'bg-gray-300'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-black text-gray-900 truncate">{notification.title}</p>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider flex-shrink-0 ml-2">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700 font-medium line-clamp-2">
                        {notification.content || notification.message}
                      </p>
                      {isPending && (
                        <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider">
                          Action Required
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {notifications.length > 5 && (
              <button
                onClick={handleViewAll}
                className="w-full p-4 text-center text-xs font-black text-gray-600 hover:text-black hover:bg-gray-50 uppercase tracking-wider transition-colors"
              >
                View All Notifications
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
