const prisma = require('../config/prisma');

class WorkSessionRepository {
  async create(data) {
    return prisma.workSession.create({ data });
  }

  async findMany(filters) {
    return prisma.workSession.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id) {
    return prisma.workSession.findUnique({
      where: { id },
      include: { earnings: true }
    });
  }

  async update(id, data) {
    return prisma.workSession.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.workSession.delete({ where: { id } });
  }

  async deleteWithEarnings(id) {
    return prisma.$transaction([
      prisma.earning.deleteMany({ where: { session_id: id } }),
      prisma.workSession.delete({ where: { id } })
    ]);
  }
}

module.exports = new WorkSessionRepository();
