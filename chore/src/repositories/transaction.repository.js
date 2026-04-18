const prisma = require('../config/prisma');

class TransactionRepository {
  async createTransaction(data) {
    return prisma.transaction.create({ data });
  }

  async findTransactionById(id) {
    return prisma.transaction.findUnique({ where: { id } });
  }

  async updateTransaction(id, data) {
    return prisma.transaction.update({ where: { id }, data });
  }

  async findTransactionsByUser(userId) {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllTransactions(skip = 0, take = 20) {
    return prisma.transaction.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new TransactionRepository();
