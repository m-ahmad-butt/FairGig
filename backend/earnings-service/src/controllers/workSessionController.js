const workSessionRepository = require('../repositories/workSessionRepository');
const { Prisma } = require('@prisma/client');
const { parseDateOnly, parseTimestamp } = require('../utils/dateUtils');
const { sendBadRequest, sendNotFound } = require('../utils/response');

class WorkSessionController {
  async create(req, res) {
    try {
      const payload = req.body;
      const startTime = parseTimestamp(payload.start_time, 'start_time');
      const endTime = parseTimestamp(payload.end_time, 'end_time');

      if (endTime <= startTime) {
        return sendBadRequest(res, 'end_time must be after start_time');
      }

      const created = await workSessionRepository.create({
        worker_id: payload.worker_id,
        platform: payload.platform.trim(),
        session_date: parseDateOnly(payload.session_date, 'session_date'),
        start_time: startTime,
        end_time: endTime,
        hours_worked: payload.hours_worked,
        trips_completed: payload.trips_completed
      });

      return res.status(201).json(created);
    } catch (error) {
      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one work session per worker per session_date is allowed');
      }

      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      console.error('Create work session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async list(req, res) {
    try {
      const { worker_id, platform, session_date } = req.query;
      const where = {};

      if (worker_id) where.worker_id = worker_id;
      if (platform) where.platform = platform;
      if (session_date) where.session_date = parseDateOnly(session_date, 'session_date');

      const sessions = await workSessionRepository.findMany(where);
      return res.json(sessions);
    } catch (error) {
      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      console.error('List work sessions error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getById(req, res) {
    try {
      const session = await workSessionRepository.findById(req.params.id);
      if (!session) {
        return sendNotFound(res, 'Work session not found');
      }
      return res.json(session);
    } catch (error) {
      console.error('Get work session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req, res) {
    try {
      const existing = await workSessionRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Work session not found');
      }

      const payload = req.body;
      const updateData = {};

      if (payload.worker_id !== undefined) updateData.worker_id = payload.worker_id;
      if (payload.platform !== undefined) updateData.platform = payload.platform.trim();
      if (payload.session_date !== undefined) {
        updateData.session_date = parseDateOnly(payload.session_date, 'session_date');
      }
      if (payload.start_time !== undefined) {
        updateData.start_time = parseTimestamp(payload.start_time, 'start_time');
      }
      if (payload.end_time !== undefined) {
        updateData.end_time = parseTimestamp(payload.end_time, 'end_time');
      }
      if (payload.hours_worked !== undefined) updateData.hours_worked = payload.hours_worked;
      if (payload.trips_completed !== undefined) updateData.trips_completed = payload.trips_completed;

      const effectiveStart = updateData.start_time || existing.start_time;
      const effectiveEnd = updateData.end_time || existing.end_time;
      if (effectiveEnd <= effectiveStart) {
        return sendBadRequest(res, 'end_time must be after start_time');
      }

      const updated = await workSessionRepository.update(req.params.id, updateData);
      return res.json(updated);
    } catch (error) {
      if (error?.code === 'P2002') {
        return sendBadRequest(res, 'Only one work session per worker per session_date is allowed');
      }

      if (error?.statusCode === 400) {
        return sendBadRequest(res, error.message);
      }

      console.error('Update work session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async remove(req, res) {
    try {
      const existing = await workSessionRepository.findById(req.params.id);
      if (!existing) {
        return sendNotFound(res, 'Work session not found');
      }

      await workSessionRepository.deleteWithEarnings(req.params.id);
      return res.json({ message: 'Work session deleted successfully' });
    } catch (error) {
      console.error('Delete work session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new WorkSessionController();
