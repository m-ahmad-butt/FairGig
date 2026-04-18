const evidenceRepository = require('../repositories/evidenceRepository');
const workSessionRepository = require('../repositories/workSessionRepository');
const { sendBadRequest, sendNotFound } = require('../utils/response');

class EvidenceController {
  async create(req, res) {
    try {
      const { worker_id, session_id, image_url } = req.body;

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
        image_url: image_url.trim()
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

  async list(req, res) {
    try {
      const { worker_id, session_id } = req.query;
      const where = {};

      if (worker_id) where.worker_id = worker_id;
      if (session_id) where.session_id = session_id;

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

      const updated = await evidenceRepository.update(req.params.id, updateData);
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
