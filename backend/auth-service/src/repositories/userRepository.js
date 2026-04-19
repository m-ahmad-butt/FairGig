const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(userData) {
    try {
      return await prisma.user.create({ data: userData });
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }

  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async updateByEmail(email, data) {
    return prisma.user.update({ where: { email }, data });
  }

  async findPendingUsers() {
    return prisma.user.findMany({
      where: {
        status: 'pending',
        emailVerified: true,
        role: { in: ['verifier', 'advocate'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserProfile(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        zone: true,
        city: true,
        category: true,
        platform: true,
        vehicleType: true,
        freelancerType: true,
        latitude: true,
        longitude: true,
        createdAt: true
      }
    });
  }

  async findOnPlatformWorkers() {
    return prisma.user.findMany({
      where: {
        role: 'worker',
        emailVerified: true,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        zone: true,
        city: true,
        category: true,
        platform: true,
        vehicleType: true,
        freelancerType: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOnPlatformWorkerById(id) {
    return prisma.user.findFirst({
      where: {
        id,
        role: 'worker',
        emailVerified: true,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        zone: true,
        city: true,
        category: true,
        platform: true,
        vehicleType: true,
        freelancerType: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}

module.exports = new UserRepository();
