const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mongoObjectIdRegex = /^[a-f\d]{24}$/i;

function isUuid(value) {
  return uuidRegex.test(value);
}

function isMongoObjectId(value) {
  return mongoObjectIdRegex.test(value);
}

function validateUuidParam(req, res, next) {
  const { id } = req.params;
  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid id format. Expected UUID.' });
  }
  next();
}

function validateCreateWorkSession(req, res, next) {
  const {
    worker_id,
    platform,
    session_date,
    start_time,
    end_time,
    hours_worked,
    trips_completed
  } = req.body;

  if (!worker_id || !platform || !session_date || !start_time || !end_time) {
    return res.status(400).json({
      error: 'worker_id, platform, session_date, start_time and end_time are required'
    });
  }

  if (typeof worker_id !== 'string' || !isMongoObjectId(worker_id)) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }

  if (typeof platform !== 'string' || platform.trim().length === 0) {
    return res.status(400).json({ error: 'platform must be a non-empty string' });
  }

  if (typeof hours_worked !== 'number' || hours_worked < 0) {
    return res.status(400).json({ error: 'hours_worked must be a non-negative number' });
  }

  if (!Number.isInteger(trips_completed) || trips_completed < 0) {
    return res.status(400).json({ error: 'trips_completed must be a non-negative integer' });
  }

  next();
}

function validateUpdateWorkSession(req, res, next) {
  const allowed = [
    'worker_id',
    'platform',
    'session_date',
    'start_time',
    'end_time',
    'hours_worked',
    'trips_completed'
  ];

  const keys = Object.keys(req.body || {});
  if (keys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalid = keys.filter((key) => !allowed.includes(key));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalid.join(', ')}` });
  }

  if (req.body.platform !== undefined && (typeof req.body.platform !== 'string' || req.body.platform.trim().length === 0)) {
    return res.status(400).json({ error: 'platform must be a non-empty string' });
  }

  if (req.body.worker_id !== undefined && (typeof req.body.worker_id !== 'string' || !isMongoObjectId(req.body.worker_id))) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }

  if (req.body.hours_worked !== undefined && (typeof req.body.hours_worked !== 'number' || req.body.hours_worked < 0)) {
    return res.status(400).json({ error: 'hours_worked must be a non-negative number' });
  }

  if (req.body.trips_completed !== undefined && (!Number.isInteger(req.body.trips_completed) || req.body.trips_completed < 0)) {
    return res.status(400).json({ error: 'trips_completed must be a non-negative integer' });
  }

  next();
}

function validateCreateEarning(req, res, next) {
  const { session_id, gross_amount } = req.body;

  if (!session_id || gross_amount === undefined) {
    return res.status(400).json({ error: 'session_id and gross_amount are required' });
  }

  if (!isUuid(session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
  }

  const asNumber = Number(gross_amount);
  if (!Number.isFinite(asNumber) || asNumber < 0) {
    return res.status(400).json({ error: 'gross_amount must be a non-negative number' });
  }

  next();
}

function validateUpdateEarning(req, res, next) {
  const allowed = ['session_id', 'gross_amount'];
  const keys = Object.keys(req.body || {});

  if (keys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalid = keys.filter((key) => !allowed.includes(key));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalid.join(', ')}` });
  }

  if (req.body.session_id !== undefined && !isUuid(req.body.session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
  }

  if (req.body.gross_amount !== undefined) {
    const asNumber = Number(req.body.gross_amount);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return res.status(400).json({ error: 'gross_amount must be a non-negative number' });
    }
  }

  next();
}

module.exports = {
  validateUuidParam,
  validateCreateWorkSession,
  validateUpdateWorkSession,
  validateCreateEarning,
  validateUpdateEarning
};
