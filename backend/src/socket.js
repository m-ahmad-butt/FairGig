let ioInstance;

const initSocket = (io) => {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('join_topic', (topicId) => {
      socket.join(topicId);
    });

    socket.on('join_notifications', (email) => {
      socket.join(email);
    });

    socket.on('disconnect', () => {});
  });
};

const getIo = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

module.exports = { initSocket, getIo };