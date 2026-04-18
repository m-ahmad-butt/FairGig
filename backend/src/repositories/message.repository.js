const prisma = require('../config/prisma');

class MessageRepository {
  async findChatByUsers(user1, user2) {
    return prisma.chat.findFirst({
      where: {
        OR: [
          { user1, user2 },
          { user1: user2, user2: user1 }
        ]
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  async createChat(user1, user2) {
    return prisma.chat.create({ data: { user1, user2 } });
  }

  async findChatById(chatId) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  async createMessage(data) {
    return prisma.message.create({ data });
  }

  async getAllChatsForUser(userEmail) {
    return prisma.chat.findMany({
      where: { OR: [{ user1: userEmail }, { user2: userEmail }] },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' }
    });
  }
}

module.exports = new MessageRepository();
