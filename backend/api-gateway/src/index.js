require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.PORT || 8080);

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

app.listen(port, '0.0.0.0', () => {
  console.log(`api-gateway listening on port ${port}`);
  console.log('Service targets:', targets);
});
