const express = require('express');
const { generateCertificateData } = require('../services/certificateService');
const { renderCertificateHtml } = require('../renderers/certificateHtmlRenderer');

function createCertificateRouter() {
  const router = express.Router();

  router.get('/income-certificate', async (req, res) => {
    const workerId = String(req.query.worker_id || '').trim();

    if (!workerId) {
      return res.status(400).json({ error: 'worker_id is required' });
    }

    try {
      const payload = await generateCertificateData(workerId, req.query);
      return res.json(payload);
    } catch (error) {
      if (error?.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Generate income certificate error:', error);
      return res.status(502).json({ error: 'Unable to generate certificate from upstream services' });
    }
  });

  router.get('/income-certificate/html', async (req, res) => {
    const workerId = String(req.query.worker_id || '').trim();
    const workerName = String(req.query.worker_name || '').trim() || 'Worker';

    if (!workerId) {
      return res.status(400).json({ error: 'worker_id is required' });
    }

    try {
      const payload = await generateCertificateData(workerId, req.query);
      const html = renderCertificateHtml(payload, workerName);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      if (error?.statusCode === 400) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Generate income certificate error:', error);
      return res.status(502).json({ error: 'Unable to generate certificate from upstream services' });
    }
  });

  return router;
}

module.exports = {
  createCertificateRouter
};
