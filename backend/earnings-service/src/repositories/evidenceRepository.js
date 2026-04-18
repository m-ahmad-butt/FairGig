const prisma = require('../config/prisma');

class EvidenceRepository {
  async create(data) {
    return prisma.evidance.create({ data });
  }

  async findMany(filters) {
    return prisma.evidance.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id) {
    return prisma.evidance.findUnique({ where: { id } });
  }

  async findBySessionId(session_id) {
    return prisma.evidance.findUnique({ where: { session_id } });
  }

  async findByWorkerId(worker_id) {
    return prisma.evidance.findMany({
      where: { worker_id },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByWorkerAndSession(worker_id, session_id) {
    return prisma.evidance.findFirst({
      where: {
        worker_id,
        session_id
      },
      include: {
        session: {
          include: {
            earning: true
          }
        }
      }
    });
  }

  async findUnverifiedWithRelations() {
    return prisma.evidance.findMany({
      where: { verified: false },
      include: {
        session: {
          include: {
            earning: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async update(id, data) {
    return prisma.evidance.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.evidance.delete({ where: { id } });
  }
}

module.exports = new EvidenceRepository();
