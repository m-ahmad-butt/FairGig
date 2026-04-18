require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4005);

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  let db = 'down';

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    db = 'up';
  } catch (error) {
    db = 'down';
  }

  return res.status(200).json({
    service: process.env.SERVICE_NAME || 'shared-agent-service',
    status: 'ok',
    db,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'shared-agent-service is running'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('shared-agent-service listening on port ' + port);
});
