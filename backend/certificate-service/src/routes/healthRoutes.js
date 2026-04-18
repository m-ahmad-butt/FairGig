const express = require('express');

function createHealthRouter(prisma) {
  const router = express.Router();

  router.get('/health', async (req, res) => {
    let db = 'down';

    try {
      await prisma.$runCommandRaw({ ping: 1 });
      db = 'up';
    } catch (error) {
      db = 'down';
    }

    return res.status(200).json({
      service: process.env.SERVICE_NAME || 'certificate-service',
      status: 'ok',
      db,
      timestamp: new Date().toISOString()
    });
  });

  router.get('/', (req, res) => {
    res.json({
      message: 'certificate-service is running'
    });
  });

  return router;
}

module.exports = {
  createHealthRouter
};
