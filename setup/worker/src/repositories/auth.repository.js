const prisma = require('../config/prisma');

class AuthRepository {
  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async createUser(data) {
    return prisma.user.create({ data });
  }

  async updatePassword(email, password) {
    return prisma.user.update({ where: { email }, data: { password } });
  }

  async createOTP(data) {
    return prisma.oTP.create({ data });
  }

  async findLatestOTP(email, code) {
    return prisma.oTP.findFirst({ where: { email, code }, orderBy: { createdAt: 'desc' } });
  }

  async deleteOTPs(email) {
    return prisma.oTP.deleteMany({ where: { email } });
  }

  async deleteExpiredOTPs() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await prisma.oTP.deleteMany({ 
      where: { 
        createdAt: { 
          lt: tenMinutesAgo 
        } 
      } 
    });
    return result.count;
  }

  async verifyUser(email) {
    return prisma.user.update({ where: { email }, data: { isVerified: true } });
  }

  async updateUserBanStatus(email, isBan) {
    return prisma.user.update({ where: { email }, data: { isBan } });
  }

  async updateUserRole(email, role) {
    return prisma.user.update({ where: { email }, data: { role } });
  }

  async getAllUsers(skip = 0, take = 20) {
    return prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } });
  }

  async getUserCount() {
    return prisma.user.count();
  }
}

module.exports = new AuthRepository();
