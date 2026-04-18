require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.PORT || 8080);

const targets = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
  earnings: process.env.EARNINGS_SERVICE_URL || 'http://earnings-service:4002',
  grievance: process.env.GRIEVANCE_SERVICE_URL || 'http://grievance-service:4003',
  certificate: process.env.CERTIFICATE_SERVICE_URL || 'http://certificate-service:4004',
  sharedAgent: process.env.SHARED_AGENT_SERVICE_URL || 'http://shared-agent-service:4005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:8001',
  anomaly: process.env.ANOMALY_SERVICE_URL || 'http://anomaly-service:8002'
};

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'api-gateway',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', createProxyMiddleware({ target: targets.auth, changeOrigin: true, pathRewrite: { '^/api/auth': '' } }));
app.use('/api/earnings', createProxyMiddleware({ target: targets.earnings, changeOrigin: true, pathRewrite: { '^/api/earnings': '' } }));
app.use('/api/grievance', createProxyMiddleware({ target: targets.grievance, changeOrigin: true, pathRewrite: { '^/api/grievance': '' } }));
app.use('/api/certificate', createProxyMiddleware({ target: targets.certificate, changeOrigin: true, pathRewrite: { '^/api/certificate': '' } }));
app.use('/api/shared-agent', createProxyMiddleware({ target: targets.sharedAgent, changeOrigin: true, pathRewrite: { '^/api/shared-agent': '' } }));
app.use('/api/analytics', createProxyMiddleware({ target: targets.analytics, changeOrigin: true, pathRewrite: { '^/api/analytics': '' } }));
app.use('/api/anomaly', createProxyMiddleware({ target: targets.anomaly, changeOrigin: true, pathRewrite: { '^/api/anomaly': '' } }));

app.get('/', (req, res) => {
  res.json({
    message: 'api-gateway running',
    routes: [
      '/api/auth/*',
      '/api/earnings/*',
      '/api/grievance/*',
      '/api/certificate/*',
      '/api/shared-agent/*',
      '/api/analytics/*',
      '/api/anomaly/*'
    ]
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('api-gateway listening on port ' + port);
});
