const notificationRepo = require('../repositories/notification.repository');
const { getIo } = require('../socket');

class NotificationService {
  async createAndEmit(notificationData) {
    try {
      // Create notification in database
      const notification = await notificationRepo.createNotification(notificationData);
      
      // Emit notification via WebSocket
      try {
        const io = getIo();
        io.to(notificationData.to).emit('notification', notification);
        console.log(`Notification emitted to ${notificationData.to}:`, notification.title);
      } catch (socketError) {
        console.error('Failed to emit notification via socket:', socketError.message);
      }
      
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async createMessageNotification(recipientEmail, senderName, messagePreview) {
    return this.createAndEmit({
      to: recipientEmail,
      title: 'New Message',
      content: `${senderName} sent you a message: ${messagePreview}`,
      type: 'message_received'
    });
  }

  async createDiscussionNotification(recipientEmail, senderName, topicName, messagePreview) {
    return this.createAndEmit({
      to: recipientEmail,
      title: 'New Discussion Message',
      content: `${senderName} replied in ${topicName}: ${messagePreview}`,
      type: 'discussion_message'
    });
  }

  async createPaymentNotification(userEmail, title, content, type = 'payment_success') {
    return this.createAndEmit({
      to: userEmail,
      title,
      content,
      type
    });
  }

  async createReputationNotification(userEmail, change, reason) {
    const type = change > 0 ? 'reputation_added' : 'reputation_deducted_abuse';
    const title = change > 0 ? 'Reputation Increased' : 'Reputation Decreased';
    const content = `Your reputation ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} points. Reason: ${reason}`;
    
    return this.createAndEmit({
      to: userEmail,
      title,
      content,
      type
    });
  }
}

module.exports = new NotificationService();
