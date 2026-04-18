const prisma = require('../config/prisma');

class EvidenceRepository {
  async create(data) {
    return prisma.evidence.create({ data });
  }

  async findMany(filters) {
    return prisma.evidence.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id) {
    return prisma.evidence.findUnique({ where: { id } });
  }

  async findBySessionId(session_id) {
    return prisma.evidence.findUnique({ where: { session_id } });
  }

  async update(id, data) {
    return prisma.evidence.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.evidence.delete({ where: { id } });
  }
}

module.exports = new EvidenceRepository();
