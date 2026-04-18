const prisma = require('../config/prisma');

class NotificationRepository {
  async createNotification(data) {
    return prisma.notification.create({ data });
  }

  async findNotificationsByUser(userEmail) {
    return prisma.notification.findMany({
      where: { to: userEmail },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markAsRead(id) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userEmail) {
    return prisma.notification.updateMany({
      where: { to: userEmail, isRead: false },
      data: { isRead: true }
    });
  }

  async getUnreadCount(userEmail) {
    return prisma.notification.count({ where: { to: userEmail, isRead: false } });
  }
}

module.exports = new NotificationRepository();
