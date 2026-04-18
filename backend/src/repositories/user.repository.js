const prisma = require('../config/prisma');

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async updateUser(email, data) {
    return prisma.user.update({ where: { email }, data });
  }

  async updateReputation(email, change, reason = 'Manual adjustment', description = null) {
    const user = await prisma.user.update({
      where: { email },
      data: { reputationScore: { increment: change } }
    });

    await prisma.reputationHistory.create({
      data: { userEmail: email, change, reason, description }
    });

    return user;
  }

  async getReputationHistory(email) {
    return prisma.reputationHistory.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findAllUsers() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

module.exports = new UserRepository();
