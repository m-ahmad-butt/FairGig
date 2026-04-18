require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4001);

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  let db = 'down';
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    db = 'up';
  } catch (error) {}
  return res.status(200).json({ service: 'auth-service', status: 'ok', db, timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => res.json({ message: 'auth-service is running' }));

app.use('/api/auth/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`auth-service listening on port ${port}`);
});
