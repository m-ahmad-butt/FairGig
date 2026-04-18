const amqp = require('amqplib');
const notificationRepo = require('../repositories/notification.repository');
const EmailConsumer = require('../consumers/email.consumer');
const redis = require('./redis');

let connection = null;
let channel = null;
let ioRef = null;
let emailConsumer = null;

const setIoRef = (io) => {
  ioRef = io;
};

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('RabbitMQ connected');
    
    await channel.assertExchange('hackathon.direct', 'direct', { durable: true });
    await channel.assertExchange('hackathon.topic', 'topic', { durable: true });
    
    const queues = ['email.notifications', 'user.events', 'discussion.events', 'transaction.events', 'notification.events'];
    for (const queueName of queues) {
      await channel.assertQueue(queueName, { durable: true });
    }

    await channel.bindQueue('email.notifications', 'hackathon.direct', 'email');
    await channel.bindQueue('user.events', 'hackathon.topic', 'user.*');
    await channel.bindQueue('discussion.events', 'hackathon.topic', 'discussion.*');
    await channel.bindQueue('transaction.events', 'hackathon.topic', 'transaction.*');
    await channel.bindQueue('notification.events', 'hackathon.topic', 'notification.*');
    await channel.bindQueue('notification.events', 'hackathon.topic', 'message.sent');
    await channel.bindQueue('notification.events', 'hackathon.topic', 'discussion.message');

    
    startNotificationConsumer();
    startEmailConsumer();

    connection.on('error', (err) => console.error('RabbitMQ error:', err));
    connection.on('close', () => console.warn('RabbitMQ closed'));
  } catch (error) {
    console.error('RabbitMQ connection failed:', error);
    throw error;
  }
};

const startNotificationConsumer = async () => {
  try {
    await channel.consume('notification.events', async (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        console.log('[RabbitMQ] Received notification event:', data);
        
        let notifData = null;

        if (data.chatId && data.senderId && data.receiverId) {
          notifData = {
            to: data.receiverId,
            from: data.senderId,
            title: 'New Message',
            content: `New message from ${data.senderId}`,
            type: 'message_received',
            metadata: {
              chatId: data.chatId
            }
          };
        } 

        else if (data.topicId && data.senderEmail) {
          notifData = {
            to: data.senderEmail,
            from: 'system',
            title: 'New Discussion Message',
            content: `New discussion message in topic`,
            type: 'discussion_message',
            metadata: {
              topicId: data.topicId
            }
          };
        }

        if (notifData) {
          const saved = await notificationRepo.createNotification(notifData);
          console.log('[RabbitMQ] Notification created:', saved.id);
          
          try {
            await redis.del(`notifications:${notifData.to}`);
            console.log('[RabbitMQ] Cache cleared for user:', notifData.to);
          } catch (cacheError) {
            console.error('[RabbitMQ] Failed to clear cache:', cacheError.message);
          }
          
          if (ioRef) {
            ioRef.to(notifData.to).emit('new_notification', saved);
            console.log('[RabbitMQ] Notification emitted to:', notifData.to);
          }
        } else {
          console.log('[RabbitMQ] No notification created - event type not recognized');
        }

        channel.ack(msg);
      }
    });
    console.log('[RabbitMQ] Notification consumer started');
  } catch (error) {
    console.error('Failed to start notification consumer:', error);
  }
};

const startEmailConsumer = async () => {
  try {
    emailConsumer = new EmailConsumer(channel);
    await emailConsumer.startConsumer();
  } catch (error) {
    console.error('Failed to start email consumer:', error);
  }
};

const publishMessage = async (routingKey, message, exchange = 'hackathon.direct') => {
  try {
    if (!channel) throw new Error('RabbitMQ channel not initialized');
    const messageBuffer = Buffer.from(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    await channel.publish(exchange, routingKey, messageBuffer, { persistent: true });
    return true;
  } catch (error) {
    console.error('Failed to publish message:', error);
    return false;
  }
};

module.exports = { connectRabbitMQ, publishMessage, setIoRef };
