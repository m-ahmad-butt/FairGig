require('dotenv').config();

const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');
const workSessionRoutes = require('./routes/workSessionRoutes');
const earningRoutes = require('./routes/earningRoutes');

const app = express();
const port = Number(process.env.PORT || 4002);

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
    service: process.env.SERVICE_NAME || 'earnings-service',
    status: 'ok',
    db,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'earnings-service is running',
    endpoints: {
      health: '/health',
      workSessions: '/work-sessions',
      earnings: '/earnings'
    }
  });
});

app.use('/work-sessions', workSessionRoutes);
app.use('/earnings', earningRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, '0.0.0.0', () => {
  console.log('earnings-service listening on port ' + port);
});
