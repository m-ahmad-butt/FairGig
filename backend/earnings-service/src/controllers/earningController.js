const earningRepository = require('../repositories/earningRepository');
const workSessionRepository = require('../repositories/workSessionRepository');
const { serializeEarning, serializeEarningList } = require('../utils/serializer');
const { sendNotFound, sendBadRequest } = require('../utils/response');

class EarningController {
  async create(req, res) {
    try {
      const { session_id, gross_earned, platform_deductions, net_received } = req.body;

      const session = await workSessionRepository.findById(session_id);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      const existingForSession = await earningRepository.findBySessionId(session_id);
      if (existingForSession) {
        return sendBadRequest(res, 'Only one earning is allowed per work session');
      }

      const created = await earningRepository.create({
        session_id,
        gross_earned: Number(gross_earned),
        platform_deductions: Number(platform_deductions),
        net_received: Number(net_received)
      });

      return res.status(201).json(serializeEarning(created));
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one earning is allowed per work session');
      }

      console.error('Create earning error:', error);
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

      const existingEarnings = await earningRepository.findBySessionIds(uniqueSessionIds);
      if (existingEarnings.length > 0) {
        const occupiedSessionIds = existingEarnings.map((entry) => entry.session_id);
        return sendBadRequest(
          res,
          `Only one earning is allowed per work session. Existing session_id values: ${occupiedSessionIds.join(', ')}`
        );
      }

      const createData = items.map((item) => ({
        session_id: item.session_id,
        gross_earned: new Prisma.Decimal(item.gross_earned),
        platform_deductions: new Prisma.Decimal(item.platform_deductions),
        net_received: new Prisma.Decimal(item.net_received)
      }));

      const created = await earningRepository.createMany(createData);

      return res.status(201).json({
        count: created.length,
        earnings: serializeEarningList(created)
      });
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one earning is allowed per work session');
      }

      console.error('Bulk create earnings error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async list(req, res) {
    try {
      const { session_id, worker_id } = req.query;
      const where = {};
      if (session_id) where.session_id = session_id;
      if (worker_id) {
        where.session = { worker_id };
      }

      const earnings = await earningRepository.findMany(where);
      return res.json(serializeEarningList(earnings));
    } catch (error) {
      console.error('List earnings error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getById(req, res) {
    try {
      const earning = await earningRepository.findById(req.params.id);
      if (!earning) {
        return sendNotFound(res, 'Earning not found');
      }
      return res.json(serializeEarning(earning));
    } catch (error) {
      console.error('Get earning error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getByWorkerAndSession(req, res) {
    try {
      const { worker_id, session_id } = req.params;
      const earning = await earningRepository.findByWorkerAndSession(worker_id, session_id);

      if (!earning) {
        return sendNotFound(res, 'Earning not found for provided worker_id and session_id');
      }

      return res.json({
        earning: serializeEarning(earning),
        session: earning.session
      });
    } catch (error) {
      console.error('Get earning by worker_id and session_id error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const existing = await earningRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Earning not found');
      }

      const { session_id, gross_earned, platform_deductions, net_received } = req.body;
      const updateData = {};

      if (session_id !== undefined) {
        const session = await workSessionRepository.findById(session_id);
        if (!session) {
          return sendNotFound(res, 'Work session not found for provided session_id');
        }

        if (session_id !== existing.session_id) {
          const earningForSession = await earningRepository.findBySessionId(session_id);
          if (earningForSession) {
            return sendBadRequest(res, 'Only one earning is allowed per work session');
          }
        }

        updateData.session_id = session_id;
      }

      if (gross_earned !== undefined) {
        updateData.gross_earned = Number(gross_earned);
      }

      if (platform_deductions !== undefined) {
        updateData.platform_deductions = Number(platform_deductions);
      }

      if (net_received !== undefined) {
        updateData.net_received = Number(net_received);
      }

      const effectiveGrossEarned = Number(
        updateData.gross_earned !== undefined ? updateData.gross_earned : existing.gross_earned
      );
      const effectivePlatformDeductions = Number(
        updateData.platform_deductions !== undefined
          ? updateData.platform_deductions
          : existing.platform_deductions
      );
      const effectiveNetReceived = Number(
        updateData.net_received !== undefined ? updateData.net_received : existing.net_received
      );

      if (effectivePlatformDeductions > effectiveGrossEarned) {
        return sendBadRequest(res, 'platform_deductions cannot be greater than gross_earned');
      }

      if (effectiveNetReceived > effectiveGrossEarned) {
        return sendBadRequest(res, 'net_received cannot be greater than gross_earned');
      }

      const updated = await earningRepository.update(req.params.id, updateData);
      return res.json(serializeEarning(updated));
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one earning is allowed per work session');
      }

      console.error('Update earning error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async remove(req, res) {
    try {
      const existing = await earningRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Earning not found');
      }

      await earningRepository.delete(req.params.id);
      return res.json({ message: 'Earning deleted successfully' });
    } catch (error) {
      console.error('Delete earning error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new EarningController();