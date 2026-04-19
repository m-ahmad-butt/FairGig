import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://s-api-gateway.duckdns.org';

let messageSocket = null;
let notificationSocket = null;

export const initMessageSocket = () => {
  if (!messageSocket) {
    const token = localStorage.getItem('token');

    messageSocket = io(API_URL, {
      path: '/socket.io/messages',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    messageSocket.on('connect', () => {
    });

    messageSocket.on('disconnect', (reason) => {
    });

    messageSocket.on('connect_error', (error) => {
      console.error('Message socket connection error:', error.message);
    });
  }
  return messageSocket;
};

export const initNotificationSocket = () => {
  if (!notificationSocket) {
    const token = localStorage.getItem('token');

    notificationSocket = io(API_URL, {
      path: '/socket.io/notifications',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    notificationSocket.on('connect', () => {
    });

    notificationSocket.on('disconnect', (reason) => {
    });

    notificationSocket.on('connect_error', (error) => {
      console.error('Notification socket connection error:', error.message);
    });
  }
  return notificationSocket;
};

export const getMessageSocket = () => {
  if (!messageSocket) {
    return initMessageSocket();
  }
  return messageSocket;
};

export const getNotificationSocket = () => {
  if (!notificationSocket) {
    return initNotificationSocket();
  }
  return notificationSocket;
};

export const disconnectSockets = () => {
  if (messageSocket) {
    messageSocket.disconnect();
    messageSocket = null;
  }
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
};

export const joinChat = (chatId) => {
  const socket = getMessageSocket();
  socket.emit('join_chat', chatId);
};

export const leaveChat = (chatId) => {
  const socket = getMessageSocket();
  socket.emit('leave_chat', chatId);
};

export const onNewMessage = (callback) => {
  const socket = getMessageSocket();
  socket.on('new_message', callback);
};

export const offNewMessage = () => {
  const socket = getMessageSocket();
  socket.off('new_message');
};

export const onNewNotification = (callback) => {
  const socket = getNotificationSocket();
  socket.on('new_notification', callback);
};

export const offNewNotification = () => {
  const socket = getNotificationSocket();
  socket.off('new_notification');
};

export const initSocket = initMessageSocket;
export const getSocket = getMessageSocket;
export const disconnectSocket = disconnectSockets;
