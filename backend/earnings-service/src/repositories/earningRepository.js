const prisma = require('../config/prisma');

class EarningRepository {
  async create(data) {
    return prisma.earning.create({ data });
  }

  async createMany(items) {
    return prisma.$transaction(
      items.map((data) => prisma.earning.create({ data }))
    );
  }

  async findMany(filters) {
    return prisma.earning.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id) {
    return prisma.earning.findUnique({ where: { id } });
  }

  async findBySessionId(session_id) {
    return prisma.earning.findUnique({ where: { session_id } });
  }

  async findBySessionIds(sessionIds) {
    return prisma.earning.findMany({
      where: {
        session_id: { in: sessionIds }
      },
      select: {
        session_id: true
      }
    });
  }

  async findByWorkerAndSession(worker_id, session_id) {
    return prisma.earning.findFirst({
      where: {
        session_id,
        session: {
          worker_id
        }
      },
      include: {
        session: true
      }
    });
  }

  async update(id, data) {
    return prisma.earning.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.earning.delete({ where: { id } });
  }
}

module.exports = new EarningRepository();
