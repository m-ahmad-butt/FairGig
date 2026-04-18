import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { markAsRead } from '../store/slices/notificationsSlice';
import notificationService from '../services/api/notificationService';
import Navbar from '../components/Navbar/Navbar';
import toast from 'react-hot-toast';
import api from '../utils/api';

function NotificationDetailPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { token } = useSelector((state) => state.auth);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchNotificationDetail();
  }, [id]);

  const fetchNotificationDetail = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotificationDetails(id);
      setNotification(data);
      
      if (!data.isRead) {
        await notificationService.markAsRead(id);
        dispatch(markAsRead(id));
      }
    } catch (error) {
      console.error('Notification detail error:', error);
      toast.error('Failed to load notification');
      navigate('/notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleChatRequestAction = async (action) => {
    if (!notification?.actionData?.requestId) return;
    
    setActionLoading(true);
    try {
      await api.post(`/api/messages/chat-requests/${notification.actionData.requestId}/${action}`);
      toast.success(`Chat request ${action}d successfully`);
      
      await fetchNotificationDetail();
      
      if (action === 'approve') {
        setTimeout(() => navigate('/messages'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const typeColor = useMemo(() => {
    if (!notification) return 'gray';
    switch (notification.type) {
      case 'abuse':
        return 'red';
      case 'reputation':
        return 'green';
      case 'message':
        return 'blue';
      case 'discussion':
        return 'purple';
      default:
        return 'gray';
    }
  }, [notification]);

  const typeIcon = useMemo(() => {
    if (!notification) return null;
    switch (notification.type) {
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
  }, [notification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-sans">
        <Navbar />
        <main className="px-8 lg:px-20 py-8 max-w-4xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium">Loading notification...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!notification) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/notifications')}
            className="text-sm font-bold text-gray-600 hover:text-black transition-colors mb-4"
          >
            Back to Notifications
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-full bg-${typeColor}-100 text-${typeColor}-600 flex items-center justify-center flex-shrink-0`}>
              {typeIcon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-black">{notification.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase bg-${typeColor}-100 text-${typeColor}-700`}>
                  {notification.type}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {notification.content}
            </p>
          </div>

          {notification.actionType === 'chat_request' && notification.actionStatus === 'pending' && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleChatRequestAction('approve')}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Accept Request'}
              </button>
              <button
                onClick={() => handleChatRequestAction('reject')}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Decline Request'}
              </button>
            </div>
          )}

          {notification.actionType === 'chat_request' && notification.actionStatus !== 'pending' && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-600">
                This request has been {notification.actionStatus}
              </p>
            </div>
          )}

          {notification.actionUrl && !notification.actionType && (
            <div className="mt-6">
              <button
                onClick={() => navigate(notification.actionUrl)}
                className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
              >
                View Details
              </button>
            </div>
          )}

          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div className="mt-8 p-6 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-sm font-bold text-gray-500 uppercase mb-4">Additional Information</p>
              <div className="space-y-2">
                {Object.entries(notification.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">{key}</span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default NotificationDetailPage;
