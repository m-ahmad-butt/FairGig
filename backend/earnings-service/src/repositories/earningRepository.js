const prisma = require('../config/prisma');

class EarningRepository {
  async create(data) {
    return prisma.earning.create({ data });
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
