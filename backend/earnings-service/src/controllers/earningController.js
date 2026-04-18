const { Prisma } = require('@prisma/client');
const earningRepository = require('../repositories/earningRepository');
const workSessionRepository = require('../repositories/workSessionRepository');
const { serializeEarning, serializeEarningList } = require('../utils/serializer');
const { sendNotFound, sendBadRequest } = require('../utils/response');

class EarningController {
  async create(req, res) {
    try {
      const { session_id, gross_amount } = req.body;

      const session = await workSessionRepository.findById(session_id);
      if (!session) {
        return sendNotFound(res, 'Work session not found for provided session_id');
      }

      const created = await earningRepository.create({
        session_id,
        gross_amount: new Prisma.Decimal(gross_amount)
      });

      return res.status(201).json(serializeEarning(created));
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      console.error('Create earning error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async list(req, res) {
    try {
      const { session_id } = req.query;
      const where = {};
      if (session_id) where.session_id = session_id;

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

  async update(req, res) {
    try {
      const existing = await earningRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Earning not found');
      }

      const { session_id, gross_amount } = req.body;
      const updateData = {};

      if (session_id !== undefined) {
        const session = await workSessionRepository.findById(session_id);
        if (!session) {
          return sendNotFound(res, 'Work session not found for provided session_id');
        }
        updateData.session_id = session_id;
      }

      if (gross_amount !== undefined) {
        updateData.gross_amount = new Prisma.Decimal(gross_amount);
      }

      const updated = await earningRepository.update(req.params.id, updateData);
      return res.json(serializeEarning(updated));
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
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
