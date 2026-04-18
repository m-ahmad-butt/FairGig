const prisma = require('../config/prisma');

class DiscussionRepository {
  async createRoom(data) {
    return prisma.room.create({ data });
  }

  async findRoomByCode(code) {
    return prisma.room.findUnique({ where: { code }, include: { topics: true, members: true } });
  }

  async findRoomById(id) {
    return prisma.room.findUnique({ where: { id }, include: { topics: true, members: true } });
  }

  async getAllPublicRooms() {
    return prisma.room.findMany({ 
      where: { isPublic: true }, 
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { topics: true, members: true }
        }
      }
    });
  }

  async getAllRoomsForUser(userEmail) {
    const publicRooms = await prisma.room.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { topics: true, members: true }
        },
        members: {
          where: { userEmail }
        }
      }
    });

    const privateRooms = await prisma.room.findMany({
      where: {
        isPublic: false,
        OR: [
          { createdBy: userEmail },
          { members: { some: { userEmail } } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { topics: true, members: true }
        },
        members: {
          where: { userEmail }
        }
      }
    });

    const allRooms = [...publicRooms, ...privateRooms].map(room => ({
      ...room,
      isMember: room.members.length > 0
    }));

    return allRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async addRoomMember(roomId, userEmail) {
    return prisma.roomMember.create({ data: { roomId, userEmail } });
  }

  async createTopic(data) {
    return prisma.topic.create({ data });
  }

  async findTopicByCode(code) {
    return prisma.topic.findUnique({ where: { code }, include: { discussionMessages: true, members: true } });
  }

  async findTopicById(id) {
    return prisma.topic.findUnique({ where: { id }, include: { discussionMessages: true, members: true } });
  }

  async getTopicsInRoom(roomId) {
    return prisma.topic.findMany({ where: { roomId }, orderBy: { createdAt: 'desc' } });
  }

  async addTopicMember(topicId, userEmail) {
    return prisma.topicMember.create({ data: { topicId, userEmail } });
  }

  async createDiscussionMessage(data) {
    return prisma.discussionMessage.create({ data });
  }

  async getDiscussionMessages(topicId) {
    return prisma.discussionMessage.findMany({ where: { topicId }, orderBy: { createdAt: 'asc' } });
  }
}

module.exports = new DiscussionRepository();
