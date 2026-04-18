require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

const { connectRabbitMQ, setIoRef } = require('./config/rabbitmq');
const { initSocket } = require('./socket');
const { rateLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { clerkAuth } = require('./middleware/auth.middleware');
const cleanupService = require('./services/cleanup.service');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const messageRoutes = require('./routes/message.routes');
const discussionRoutes = require('./routes/discussion.routes');
const notificationRoutes = require('./routes/notification.routes');
const transactionRoutes = require('./routes/transaction.routes');
const adminRoutes = require('./routes/admin.routes');

const transactionController = require('./controllers/transaction.controller');

const app = express();
const server = createServer(app);

// Trust proxy to get real client IP (for rate limiting)
app.set('trust proxy', true);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost", "http://localhost:80", "http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

initSocket(io);
setIoRef(io);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

app.use(cors({
  origin: ["http://localhost", "http://localhost:80", "http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email']
}));

// Webhook middleware MUST come before JSON parser
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), transactionController.handleWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'hackathon-backend-monolith'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Hackathon Backend API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      messages: '/api/messages/*',
      discussions: '/api/discussions/*',
      notifications: '/api/notifications/*',
      transactions: '/api/transactions/*',
      admin: '/api/admin/*'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', clerkAuth, userRoutes);
app.use('/api/messages', clerkAuth, messageRoutes);
app.use('/api/discussions', clerkAuth, discussionRoutes);
app.use('/api/notifications', clerkAuth, notificationRoutes);
app.use('/api/transactions', clerkAuth, transactionRoutes);
app.use('/api/admin', clerkAuth, adminRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

connectRabbitMQ().then(() => {
  server.listen(PORT, () => {
    console.log(`Hackathon Backend Server running on port ${PORT}`);
    
    // Start cleanup service
    cleanupService.start();
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;