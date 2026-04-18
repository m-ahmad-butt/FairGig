require('dotenv').config();

const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');
const communityRoutes = require('./routes/communityRoutes');
const moderationRoutes = require('./routes/moderationRoutes');

const app = express();
const port = Number(process.env.PORT || 4003);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', async (req, res) => {
  let db = 'down';

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    db = 'up';
  } catch (error) {}

  return res.status(200).json({
    service: process.env.SERVICE_NAME || 'grievance-service',
    status: 'ok',
    db,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'grievance-service is running'
  });
});

app.use('/community', communityRoutes);
app.use('/community/moderation', moderationRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled grievance-service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log('grievance-service listening on port ' + port);
});
