const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

prisma.$connect()
  .then(() => console.log('Prisma connected to MongoDB'))
  .catch((err) => {
    console.error('Prisma connection error:', err);
    process.exit(1);
  });

module.exports = prisma;
