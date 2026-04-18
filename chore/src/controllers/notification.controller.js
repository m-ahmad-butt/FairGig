const notificationRepo = require('../repositories/notification.repository');
const redis = require('../config/redis');

const CACHE_TTL = 300;

const getFromCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const setCache = async (key, value) => {
  try { await redis.setex(key, CACHE_TTL, JSON.stringify(value)); } catch { }
};

const delCache = async (...keys) => {
  try { if (keys.length) await redis.del(...keys); } catch { }
};

const getAll = async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const cacheKey = `notifications:${userEmail}`;

    const cached = await getFromCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const notifications = await notificationRepo.findNotificationsByUser(userEmail);
    await setCache(cacheKey, notifications);
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers['x-user-email'];
    
    const notifications = await notificationRepo.findNotificationsByUser(userEmail);
    const notification = notifications.find(n => n.id === id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json(notification);
  } catch (error) {
    console.error('Get notification by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationRepo.markAsRead(id);
    
    const userEmail = req.headers['x-user-email'];
    await delCache(`notifications:${userEmail}`);
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    await notificationRepo.markAllAsRead(userEmail);
    
    await delCache(`notifications:${userEmail}`);
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const count = await notificationRepo.getUnreadCount(userEmail);
    
    res.status(200).json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAll, getById, markAsRead, markAllAsRead, getUnreadCount };