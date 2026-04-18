const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RefreshTokenRepository {
  async create(tokenData) {
    return prisma.refreshToken.create({ data: tokenData });
  }

  async findByToken(token) {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async deleteByToken(token) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  }

  async deleteExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }
}

module.exports = new RefreshTokenRepository();
