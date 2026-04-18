const prisma = require('../config/prisma');

class WorkSessionRepository {
  async create(data) {
    return prisma.workSession.create({ data });
  }

  async createMany(items) {
    return prisma.$transaction(
      items.map((data) => prisma.workSession.create({ data }))
    );
  }

  async findMany(filters) {
    return prisma.workSession.findMany({
      where: filters,
      include: { earning: true, evidance: true },
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id) {
    return prisma.workSession.findUnique({
      where: { id },
      include: { earning: true, evidance: true }
    });
  }

  async findByWorkerId(worker_id) {
    return prisma.workSession.findMany({
      where: { worker_id },
      include: { earning: true, evidance: true },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByIds(ids) {
    return prisma.workSession.findMany({
      where: {
        id: { in: ids }
      }
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
      prisma.evidance.deleteMany({ where: { session_id: id } }),
      prisma.earning.deleteMany({ where: { session_id: id } }),
      prisma.workSession.delete({ where: { id } })
    ]);
  }
}

module.exports = new WorkSessionRepository();
