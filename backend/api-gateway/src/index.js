require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { randomUUID } = require('crypto');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const port = Number(process.env.PORT || 8080);
const notificationDbUrl = process.env.NOTIFICATION_DATABASE_URL || process.env.DATABASE_URL || 'mongodb://api-gateway-mongo:27017/api_gateway_notifications';
const notificationCollectionName = process.env.NOTIFICATION_COLLECTION_NAME || 'notifications';
const notificationQueryLimit = Number(process.env.NOTIFICATION_QUERY_LIMIT || 50);

function resolveDatabaseName(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const dbName = (parsed.pathname || '').replace(/^\//, '');
    if (dbName) {
      return dbName;
    }
  } catch (error) {
    console.warn('Could not parse notification database URL, falling back to default database name');
  }

  return 'api_gateway_notifications';
}

const notificationDatabaseName = process.env.NOTIFICATION_DATABASE_NAME || resolveDatabaseName(notificationDbUrl);
let notificationMongoClient = null;
let notificationCollection = null;

// Store connected users for notification broadcasting
const connectedUsers = new Map();

function getNotificationCollection() {
  if (!notificationCollection) {
    throw new Error('Notification collection is not initialized');
  }

  return notificationCollection;
}

function createNotificationId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function serializeNotification(document) {
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    type: document.type,
    title: document.title,
    message: document.message,
    data: document.data || {},
    read: Boolean(document.read),
    created_at: document.created_at ? new Date(document.created_at).toISOString() : new Date().toISOString()
  };
}

async function initializeNotificationStore(maxAttempts = 12) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      notificationMongoClient = new MongoClient(notificationDbUrl, {
        serverSelectionTimeoutMS: 8000
      });
      await notificationMongoClient.connect();

      const database = notificationMongoClient.db(notificationDatabaseName);
      notificationCollection = database.collection(notificationCollectionName);

      await Promise.all([
        notificationCollection.createIndex({ id: 1 }, { unique: true }),
        notificationCollection.createIndex({ user_id: 1, created_at: -1 }),
        notificationCollection.createIndex({ user_id: 1, read: 1, created_at: -1 })
      ]);

      console.log('Notification store initialized:', {
        database: notificationDatabaseName,
        collection: notificationCollectionName
      });
      return;
    } catch (error) {
      if (notificationMongoClient) {
        try {
          await notificationMongoClient.close();
        } catch (closeError) {
          console.error('Failed to close notification DB client after error:', closeError);
        }
      }

      notificationMongoClient = null;
      notificationCollection = null;

      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(`Notification DB connection attempt ${attempt}/${maxAttempts} failed. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const targets = {
  auth: process.env.AUTH_SERVICE_URL,
  earnings: process.env.EARNINGS_SERVICE_URL,
  grievance: process.env.GRIEVANCE_SERVICE_URL,
  certificate: process.env.CERTIFICATE_SERVICE_URL,
  sharedAgent: process.env.SHARED_AGENT_SERVICE_URL,
  analytics: process.env.ANALYTICS_SERVICE_URL,
  anomaly: process.env.ANOMALY_SERVICE_URL
};

app.use(cors());

// Socket.io namespace for notifications
const notificationNamespace = io.of('/socket.io/notifications');

notificationNamespace.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  
  // For now, we'll store by socket id, but could decode JWT to get user_id
  connectedUsers.set(socket.id, {
    token,
    userId: null // Will be set when user context is available
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
  });
});

// Endpoint to emit notifications (called by other services)
app.post('/internal/notify', express.json(), async (req, res) => {
  try {
    const { user_id, type, title, message, data } = req.body;

    if (!user_id || !type) {
      return res.status(400).json({ error: 'user_id and type are required' });
    }

    const normalizedUserId = String(user_id);
    const now = new Date();
    const notificationDocument = {
      id: createNotificationId(),
      user_id: normalizedUserId,
      type,
      title: title || 'Notification',
      message: message || '',
      data: data || {},
      created_at: now,
      updated_at: now,
      read: false
    };

    await getNotificationCollection().insertOne(notificationDocument);

    const notification = serializeNotification(notificationDocument);

    // Broadcast to all connected sockets (ideally filter by user_id in namespace)
    notificationNamespace.emit('new_notification', {
      user_id: normalizedUserId,
      notification
    });

    return res.json({ success: true, notification });
  } catch (error) {
    console.error('Failed to store notification:', error);
    return res.status(500).json({ error: 'Failed to store notification' });
  }
});

app.get('/internal/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const requestedLimit = Number(req.query.limit || notificationQueryLimit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 200)
      : notificationQueryLimit;

    const documents = await getNotificationCollection()
      .find({ user_id: String(user_id) })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return res.json(documents.map(serializeNotification));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/internal/notifications/:id/read', express.json(), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.user_id || req.query?.user_id;

    const filter = { id };
    if (userId) {
      filter.user_id = String(userId);
    }

    const updateResult = await getNotificationCollection().updateOne(
      filter,
      {
        $set: {
          read: true,
          updated_at: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updatedDocument = await getNotificationCollection().findOne(filter);

    return res.json({
      success: true,
      notification: serializeNotification(updatedDocument)
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

app.use(cors());

app.use('/health', express.json());
app.use('/', (req, res, next) => {
  if (req.path === '/' || req.path === '/health') {
    express.json()(req, res, next);
  } else {
    next();
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ service: 'api-gateway', status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/admin', createProxyMiddleware({
  target: targets.auth,
  changeOrigin: true,
  pathRewrite: (path) => `/api/auth/admin${path}`,
  timeout: 30000,
  proxyTimeout: 30000
}));

app.use('/admin', createProxyMiddleware({
  target: targets.auth,
  changeOrigin: true,
  pathRewrite: (path) => `/api/auth/admin${path}`,
  timeout: 30000,
  proxyTimeout: 30000
}));

app.use('/api/auth', createProxyMiddleware({ 
  target: targets.auth, 
  changeOrigin: true,
  pathRewrite: (path) => `/api/auth${path}`,
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err.message);
    res.status(502).json({ error: 'Auth service unavailable', details: err.message });
  }
}));

app.use('/api/earnings', createProxyMiddleware({ 
  target: targets.earnings, 
  changeOrigin: true, 
  pathRewrite: { '^/api/earnings': '' },
  onError: (err, req, res) => {
    console.error('Earnings service proxy error:', err.message);
    res.status(502).json({ error: 'Earnings service unavailable' });
  }
}));

app.use('/api/grievance', createProxyMiddleware({ 
  target: targets.grievance, 
  changeOrigin: true, 
  pathRewrite: { '^/api/grievance': '' },
  onError: (err, req, res) => {
    console.error('Grievance service proxy error:', err.message);
    res.status(502).json({ error: 'Grievance service unavailable' });
  }
}));

app.use('/api/certificate', createProxyMiddleware({ 
  target: targets.certificate, 
  changeOrigin: true, 
  pathRewrite: { '^/api/certificate': '' },
  onError: (err, req, res) => {
    console.error('Certificate service proxy error:', err.message);
    res.status(502).json({ error: 'Certificate service unavailable' });
  }
}));

app.use('/api/shared-agent', createProxyMiddleware({ 
  target: targets.sharedAgent, 
  changeOrigin: true, 
  pathRewrite: { '^/api/shared-agent': '' },
  onError: (err, req, res) => {
    console.error('Shared agent service proxy error:', err.message);
    res.status(502).json({ error: 'Shared agent service unavailable' });
  }
}));

app.use('/api/analytics', createProxyMiddleware({ 
  target: targets.analytics, 
  changeOrigin: true, 
  pathRewrite: { '^/api/analytics': '' },
  onError: (err, req, res) => {
    console.error('Analytics service proxy error:', err.message);
    res.status(502).json({ error: 'Analytics service unavailable' });
  }
}));

app.use('/api/anomaly', createProxyMiddleware({ 
  target: targets.anomaly, 
  changeOrigin: true, 
  pathRewrite: { '^/api/anomaly': '' },
  onError: (err, req, res) => {
    console.error('Anomaly service proxy error:', err.message);
    res.status(502).json({ error: 'Anomaly service unavailable' });
  }
}));

app.get('/', (req, res) => {
  res.json({
    message: 'api-gateway running',
    routes: ['/api/auth/*', '/api/admin/*', '/admin/*', '/api/earnings/*', '/api/grievance/*', '/api/certificate/*', '/api/shared-agent/*', '/api/analytics/*', '/api/anomaly/*']
  });
});

app.use((err, req, res, next) => {
  console.error('API Gateway error:', err);
  res.status(500).json({ error: 'Gateway error' });
});

function registerShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down api-gateway...`);
    try {
      if (notificationMongoClient) {
        await notificationMongoClient.close();
      }
    } catch (error) {
      console.error('Error while closing notification DB connection:', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function startServer() {
  try {
    await initializeNotificationStore();

    server.listen(port, '0.0.0.0', () => {
      console.log(`api-gateway listening on port ${port}`);
      console.log('Service targets:', targets);
      console.log('Notification database URL:', notificationDbUrl);
    });

    registerShutdownHandlers();
  } catch (error) {
    console.error('Failed to start api-gateway:', error);
    process.exit(1);
  }
}

startServer();
