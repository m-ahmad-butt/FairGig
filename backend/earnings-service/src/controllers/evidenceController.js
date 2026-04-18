const evidenceRepository = require('../repositories/evidenceRepository');
const workSessionRepository = require('../repositories/workSessionRepository');
const { sendBadRequest, sendNotFound } = require('../utils/response');
const { serializeEarning } = require('../utils/serializer');
const { triggerAnomalyDetection } = require('../utils/anomalyServiceClient');
const { createEvidenceUploadUrls, uploadEvidenceBuffer } = require('../utils/evidenceUploadService');

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:8080';

function shouldTriggerAnomalyDetection(previousVerified, nextVerified) {
  return previousVerified !== true && nextVerified === true;
}

async function emitWorkerNotification(workerId, verificationStatus, reviewerNotes) {
  try {
    const notificationType = verificationStatus === true ? 'evidence_verified' : 
                            verificationStatus === false ? 'evidence_flagged' : 
                            'evidence_unverifiable';
    
    const titles = {
      'evidence_verified': '✅ Your earnings were verified',
      'evidence_flagged': '⚠️ Your earnings were flagged for review',
      'evidence_unverifiable': '❓ Your earnings were marked as unverifiable'
    };

    const messages = {
      'evidence_verified': 'Your earnings submission has been verified and approved.',
      'evidence_flagged': 'A discrepancy was found in your submission. Please review the notes.',
      'evidence_unverifiable': 'Your submission could not be verified. Please resubmit.'
    };

    await fetch(`${API_GATEWAY_URL}/internal/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: workerId,
        type: notificationType,
        title: titles[notificationType],
        message: messages[notificationType],
        data: {
          status: verificationStatus,
          reviewer_notes: reviewerNotes || null
        }
      })
    }).catch((error) => {
      console.error('Failed to emit worker notification:', error.message);
      // Don't throw - notification failure shouldn't block verification
    });
  } catch (error) {
    console.error('Error in emitWorkerNotification:', error);
  }
}

async function fetchWorkerFromAuthService(workerId) {
  const bases = [AUTH_SERVICE_BASE_URL, 'http://localhost:4001'];
  const uniqueBases = [...new Set(bases.filter(Boolean))];

  for (const baseUrl of uniqueBases) {
    try {
      const url = `${baseUrl}/api/auth/workers/on-platform?worker_id=${encodeURIComponent(workerId)}`;
      const response = await fetch(url);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      return payload?.worker || null;
    } catch (error) {
      continue;
    }
  }

  return null;
}

class EvidenceController {
  async uploadEvidenceBinary(req, res) {
    try {
      const { session_id, worker_id } = req.body || {};

      if (!session_id) {
        return sendBadRequest(res, 'session_id is required');
      }

      if (!req.file) {
        return sendBadRequest(res, 'image file is required');
      }

      const session = await workSessionRepository.findById(session_id);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      if (worker_id && worker_id !== session.worker_id) {
        return sendBadRequest(res, 'worker_id must match the owner of the provided session_id');
      }

      const uploaded = await uploadEvidenceBuffer({
        sessionId: session_id,
        workerId: session.worker_id,
        fileType: req.file.mimetype,
        buffer: req.file.buffer
      });

      return res.json({
        ...uploaded,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      });
    } catch (error) {
      if (error?.code === 'VALIDATION_ERROR') {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'CONFIG_ERROR') {
        return res.status(500).json({ error: error.message });
      }

      console.error('Upload evidence image error:', error);
      return res.status(500).json({ error: 'Failed to upload evidence image' });
    }
  }

  async getPresignedUrl(req, res) {
    try {
      const { session_id, file_type } = req.query;

      if (!session_id) {
        return sendBadRequest(res, 'session_id query param is required');
      }

      if (!file_type) {
        return sendBadRequest(res, 'file_type query param is required');
      }

      const session = await workSessionRepository.findById(session_id);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      const signedUpload = await createEvidenceUploadUrls({
        sessionId: session_id,
        workerId: session.worker_id,
        fileType: file_type
      });

      return res.json(signedUpload);
    } catch (error) {
      if (error?.code === 'VALIDATION_ERROR') {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'CONFIG_ERROR') {
        return res.status(500).json({ error: error.message });
      }

      console.error('Generate evidence presigned URL error:', error);
      return res.status(500).json({ error: 'Failed to generate presigned upload URL' });
    }
  }

  async create(req, res) {
    try {
      const { worker_id, session_id, image_url, verified } = req.body;

      const session = await workSessionRepository.findById(session_id);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      if (session.worker_id !== worker_id) {
        return sendBadRequest(res, 'worker_id must match the owner of the provided session_id');
      }

      const existingForSession = await evidenceRepository.findBySessionId(session_id);
      if (existingForSession) {
        return sendBadRequest(res, 'Only one image evidence is allowed per session');
      }

      const created = await evidenceRepository.create({
        worker_id,
        session_id,
        image_url: image_url.trim(),
        ...(verified !== undefined ? { verified } : {})
      });

      return res.status(201).json(created);
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one image evidence is allowed per session');
      }

      console.error('Create evidence error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async bulkCreate(req, res) {
    try {
      const { items } = req.body;
      const uniqueSessionIds = [...new Set(items.map((item) => item.session_id))];

      const sessions = await workSessionRepository.findByIds(uniqueSessionIds);
      const sessionMap = new Map(sessions.map((session) => [session.id, session]));

      const missingSessionIds = uniqueSessionIds.filter((sessionId) => !sessionMap.has(sessionId));
      if (missingSessionIds.length > 0) {
        return sendBadRequest(
          res,
          `Work session not found for session_id values: ${missingSessionIds.join(', ')}`
        );
      }

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const session = sessionMap.get(item.session_id);

        if (session.worker_id !== item.worker_id) {
          return sendBadRequest(
            res,
            `items[${index}].worker_id must match owner of session_id ${item.session_id}`
          );
        }
      }

      const existingEvidences = await evidenceRepository.findBySessionIds(uniqueSessionIds);
      if (existingEvidences.length > 0) {
        const occupiedSessionIds = existingEvidences.map((entry) => entry.session_id);
        return sendBadRequest(
          res,
          `Only one image evidence is allowed per session. Existing session_id values: ${occupiedSessionIds.join(', ')}`
        );
      }

      const createData = items.map((item) => ({
        worker_id: item.worker_id,
        session_id: item.session_id,
        image_url: item.image_url.trim(),
        ...(item.verified !== undefined ? { verified: item.verified } : {})
      }));

      const created = await evidenceRepository.createMany(createData);

      return res.status(201).json({
        count: created.length,
        evidences: created
      });
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one image evidence is allowed per session');
      }

      console.error('Bulk create evidence error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async list(req, res) {
    try {
      const { worker_id, session_id, verified } = req.query;
      const where = {};

      if (worker_id) where.worker_id = worker_id;
      if (session_id) where.session_id = session_id;
      if (verified !== undefined) {
        if (verified !== 'true' && verified !== 'false') {
          return sendBadRequest(res, 'verified query param must be true or false');
        }
        where.verified = verified === 'true';
      }

      const evidences = await evidenceRepository.findMany(where);
      return res.json(evidences);
    } catch (error) {
      console.error('List evidences error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getById(req, res) {
    try {
      const evidence = await evidenceRepository.findById(req.params.id);
      if (!evidence) {
        return sendNotFound(res, 'Evidence not found');
      }

      return res.json(evidence);
    } catch (error) {
      console.error('Get evidence error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getByWorkerId(req, res) {
    try {
      const evidences = await evidenceRepository.findByWorkerId(req.params.worker_id);
      return res.json({
        worker_id: req.params.worker_id,
        count: evidences.length,
        evidences
      });
    } catch (error) {
      console.error('Get evidences by worker_id error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getByWorkerAndSession(req, res) {
    try {
      const { worker_id, session_id } = req.params;
      const evidence = await evidenceRepository.findByWorkerAndSession(worker_id, session_id);

      if (!evidence) {
        return sendNotFound(res, 'Evidence not found for provided worker_id and session_id');
      }

      return res.json({
        evidence,
        session: evidence.session || null,
        earning: evidence.session?.earning ? serializeEarning(evidence.session.earning) : null
      });
    } catch (error) {
      console.error('Get evidence by worker_id and session_id error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listUnverifiedDetailed(req, res) {
    try {
      const evidences = await evidenceRepository.findUnverifiedWithRelations();
      const uniqueWorkerIds = [...new Set(evidences.map((item) => item.worker_id).filter(Boolean))];

      const workerEntries = await Promise.all(
        uniqueWorkerIds.map(async (workerId) => {
          const worker = await fetchWorkerFromAuthService(workerId);
          return [workerId, worker];
        })
      );

      const workerMap = Object.fromEntries(workerEntries);

      const items = evidences.map((item) => {
        const session = item.session || null;
        const earning = session?.earning ? serializeEarning(session.earning) : null;
        return {
          evidence: {
            id: item.id,
            worker_id: item.worker_id,
            session_id: item.session_id,
            image_url: item.image_url,
            verified: item.verified,
            created_at: item.created_at
          },
          session,
          earning,
          worker: workerMap[item.worker_id] || null
        };
      });

      return res.json({
        count: items.length,
        items
      });
    } catch (error) {
      console.error('List unverified evidences with details error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const existing = await evidenceRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Evidence not found');
      }

      const nextWorkerId = req.body.worker_id ?? existing.worker_id;
      const nextSessionId = req.body.session_id ?? existing.session_id;

      const session = await workSessionRepository.findById(nextSessionId);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      if (session.worker_id !== nextWorkerId) {
        return sendBadRequest(res, 'worker_id must match the owner of the provided session_id');
      }

      if (nextSessionId !== existing.session_id) {
        const evidenceForSession = await evidenceRepository.findBySessionId(nextSessionId);
        if (evidenceForSession) {
          return sendBadRequest(res, 'Only one image evidence is allowed per session');
        }
      }

      const updateData = {};
      if (req.body.worker_id !== undefined) updateData.worker_id = req.body.worker_id;
      if (req.body.session_id !== undefined) updateData.session_id = req.body.session_id;
      if (req.body.image_url !== undefined) updateData.image_url = req.body.image_url.trim();
      if (req.body.verified !== undefined) updateData.verified = req.body.verified;
      if (req.body.reviewer_notes !== undefined) updateData.reviewer_notes = req.body.reviewer_notes || null;

      const updated = await evidenceRepository.update(req.params.id, updateData);

      if (shouldTriggerAnomalyDetection(existing.verified, updated.verified)) {
        triggerAnomalyDetection({
          worker_id: updated.worker_id,
          session_id: updated.session_id,
          evidence_id: updated.id
        }).catch((triggerError) => {
          console.error('Anomaly trigger failed after evidence update:', {
            evidence_id: updated.id,
            worker_id: updated.worker_id,
            session_id: updated.session_id,
            error: triggerError?.message || triggerError
          });
        });
      }

      return res.json(updated);
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one image evidence is allowed per session');
      }

      console.error('Update evidence error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateVerified(req, res) {
    try {
      const existing = await evidenceRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Evidence not found');
      }

      const updateData = { verified: req.body.verified };
      if (req.body.reviewer_notes !== undefined) {
        updateData.reviewer_notes = req.body.reviewer_notes || null;
      }

      const updated = await evidenceRepository.update(req.params.id, updateData);

      // Emit notification to worker
      emitWorkerNotification(
        updated.worker_id,
        updated.verified,
        updated.reviewer_notes
      );

      if (shouldTriggerAnomalyDetection(existing.verified, updated.verified)) {
        triggerAnomalyDetection({
          worker_id: updated.worker_id,
          session_id: updated.session_id,
          evidence_id: updated.id
        }).catch((triggerError) => {
          console.error('Anomaly trigger failed after verified update:', {
            evidence_id: updated.id,
            worker_id: updated.worker_id,
            session_id: updated.session_id,
            error: triggerError?.message || triggerError
          });
        });
      }

      return res.json({
        message: 'Evidence verification status updated successfully',
        evidence: updated
      });
    } catch (error) {
      console.error('Update evidence verified status error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async remove(req, res) {
    try {
      const existing = await evidenceRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Evidence not found');
      }

      await evidenceRepository.delete(req.params.id);
      return res.json({ message: 'Evidence deleted successfully' });
    } catch (error) {
      console.error('Delete evidence error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new EvidenceController();
