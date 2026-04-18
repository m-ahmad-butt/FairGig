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

function validateWorkerIdParam(req, res, next) {
  const { worker_id } = req.params;
  if (!worker_id || !isMongoObjectId(worker_id)) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }
  next();
}

function validateWorkerAndSessionParams(req, res, next) {
  const { worker_id, session_id } = req.params;

  if (!worker_id || !isMongoObjectId(worker_id)) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }

  if (!session_id || !isUuid(session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
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

function validateBulkWorkSessions(req, res, next) {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const seenSessionIds = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const {
      session_id,
      worker_id,
      platform,
      session_date,
      start_time,
      end_time,
      hours_worked,
      trips_completed
    } = item;

    if (!session_id || !worker_id || !platform || !session_date || !start_time || !end_time) {
      return res.status(400).json({
        error: `items[${index}] must include session_id, worker_id, platform, session_date, start_time and end_time`
      });
    }

    if (!isUuid(session_id)) {
      return res.status(400).json({ error: `items[${index}].session_id must be a UUID` });
    }

    if (seenSessionIds.has(session_id)) {
      return res.status(400).json({ error: `Duplicate session_id in bulk payload: ${session_id}` });
    }
    seenSessionIds.add(session_id);

    if (typeof worker_id !== 'string' || !isMongoObjectId(worker_id)) {
      return res.status(400).json({
        error: `items[${index}].worker_id must be a valid auth-service user id (Mongo ObjectId string)`
      });
    }

    if (typeof platform !== 'string' || platform.trim().length === 0) {
      return res.status(400).json({ error: `items[${index}].platform must be a non-empty string` });
    }

    if (typeof hours_worked !== 'number' || hours_worked < 0) {
      return res.status(400).json({ error: `items[${index}].hours_worked must be a non-negative number` });
    }

    if (!Number.isInteger(trips_completed) || trips_completed < 0) {
      return res.status(400).json({ error: `items[${index}].trips_completed must be a non-negative integer` });
    }
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
  const { session_id, gross_earned, platform_deductions, net_received } = req.body;

  if (!session_id || gross_earned === undefined || platform_deductions === undefined || net_received === undefined) {
    return res.status(400).json({
      error: 'session_id, gross_earned, platform_deductions and net_received are required'
    });
  }

  if (!isUuid(session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
  }

  const grossEarnedValue = Number(gross_earned);
  const platformDeductionsValue = Number(platform_deductions);
  const netReceivedValue = Number(net_received);

  if (!Number.isFinite(grossEarnedValue) || grossEarnedValue < 0) {
    return res.status(400).json({ error: 'gross_earned must be a non-negative number' });
  }

  if (!Number.isFinite(platformDeductionsValue) || platformDeductionsValue < 0) {
    return res.status(400).json({ error: 'platform_deductions must be a non-negative number' });
  }

  if (!Number.isFinite(netReceivedValue) || netReceivedValue < 0) {
    return res.status(400).json({ error: 'net_received must be a non-negative number' });
  }

  if (platformDeductionsValue > grossEarnedValue) {
    return res.status(400).json({ error: 'platform_deductions cannot be greater than gross_earned' });
  }

  if (netReceivedValue > grossEarnedValue) {
    return res.status(400).json({ error: 'net_received cannot be greater than gross_earned' });
  }

  next();
}

function validateBulkEarnings(req, res, next) {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const seenSessionIds = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const { worker_id, session_id, gross_earned, platform_deductions, net_received } = item;

    if (!worker_id || !session_id || gross_earned === undefined || platform_deductions === undefined || net_received === undefined) {
      return res.status(400).json({
        error: `items[${index}] must include worker_id, session_id, gross_earned, platform_deductions and net_received`
      });
    }

    if (typeof worker_id !== 'string' || !isMongoObjectId(worker_id)) {
      return res.status(400).json({
        error: `items[${index}].worker_id must be a valid auth-service user id (Mongo ObjectId string)`
      });
    }

    if (!isUuid(session_id)) {
      return res.status(400).json({ error: `items[${index}].session_id must be a UUID` });
    }

    if (seenSessionIds.has(session_id)) {
      return res.status(400).json({ error: `Duplicate session_id in bulk payload: ${session_id}` });
    }
    seenSessionIds.add(session_id);

    const grossEarnedValue = Number(gross_earned);
    const platformDeductionsValue = Number(platform_deductions);
    const netReceivedValue = Number(net_received);

    if (!Number.isFinite(grossEarnedValue) || grossEarnedValue < 0) {
      return res.status(400).json({ error: `items[${index}].gross_earned must be a non-negative number` });
    }

    if (!Number.isFinite(platformDeductionsValue) || platformDeductionsValue < 0) {
      return res.status(400).json({ error: `items[${index}].platform_deductions must be a non-negative number` });
    }

    if (!Number.isFinite(netReceivedValue) || netReceivedValue < 0) {
      return res.status(400).json({ error: `items[${index}].net_received must be a non-negative number` });
    }

    if (platformDeductionsValue > grossEarnedValue) {
      return res.status(400).json({
        error: `items[${index}].platform_deductions cannot be greater than gross_earned`
      });
    }

    if (netReceivedValue > grossEarnedValue) {
      return res.status(400).json({ error: `items[${index}].net_received cannot be greater than gross_earned` });
    }
  }

  next();
}

function validateUpdateEarning(req, res, next) {
  const allowed = ['session_id', 'gross_earned', 'platform_deductions', 'net_received'];
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

  if (req.body.gross_earned !== undefined) {
    const asNumber = Number(req.body.gross_earned);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return res.status(400).json({ error: 'gross_earned must be a non-negative number' });
    }
  }

  if (req.body.platform_deductions !== undefined) {
    const asNumber = Number(req.body.platform_deductions);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return res.status(400).json({ error: 'platform_deductions must be a non-negative number' });
    }
  }

  if (req.body.net_received !== undefined) {
    const asNumber = Number(req.body.net_received);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return res.status(400).json({ error: 'net_received must be a non-negative number' });
    }
  }

  const grossEarnedValue = req.body.gross_earned !== undefined ? Number(req.body.gross_earned) : undefined;
  const platformDeductionsValue = req.body.platform_deductions !== undefined ? Number(req.body.platform_deductions) : undefined;
  const netReceivedValue = req.body.net_received !== undefined ? Number(req.body.net_received) : undefined;

  if (
    grossEarnedValue !== undefined &&
    platformDeductionsValue !== undefined &&
    platformDeductionsValue > grossEarnedValue
  ) {
    return res.status(400).json({ error: 'platform_deductions cannot be greater than gross_earned' });
  }

  if (
    grossEarnedValue !== undefined &&
    netReceivedValue !== undefined &&
    netReceivedValue > grossEarnedValue
  ) {
    return res.status(400).json({ error: 'net_received cannot be greater than gross_earned' });
  }

  next();
}

function validateCreateEvidence(req, res, next) {
  const { worker_id, session_id, image_url, verified } = req.body;

  if (!worker_id || !session_id || !image_url) {
    return res.status(400).json({ error: 'worker_id, session_id and image_url are required' });
  }

  if (typeof worker_id !== 'string' || !isMongoObjectId(worker_id)) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }

  if (!isUuid(session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
  }

  if (typeof image_url !== 'string' || image_url.trim().length === 0) {
    return res.status(400).json({ error: 'image_url must be a non-empty string' });
  }

  if (verified !== undefined && typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be a boolean value' });
  }

  next();
}

function validateBulkEvidence(req, res, next) {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const seenSessionIds = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const { worker_id, session_id, image_url, verified } = item;

    if (!worker_id || !session_id || !image_url) {
      return res.status(400).json({
        error: `items[${index}] must include worker_id, session_id and image_url`
      });
    }

    if (typeof worker_id !== 'string' || !isMongoObjectId(worker_id)) {
      return res.status(400).json({
        error: `items[${index}].worker_id must be a valid auth-service user id (Mongo ObjectId string)`
      });
    }

    if (!isUuid(session_id)) {
      return res.status(400).json({ error: `items[${index}].session_id must be a UUID` });
    }

    if (seenSessionIds.has(session_id)) {
      return res.status(400).json({ error: `Duplicate session_id in bulk payload: ${session_id}` });
    }
    seenSessionIds.add(session_id);

    if (typeof image_url !== 'string' || image_url.trim().length === 0) {
      return res.status(400).json({ error: `items[${index}].image_url must be a non-empty string` });
    }

    if (verified !== undefined && typeof verified !== 'boolean') {
      return res.status(400).json({ error: `items[${index}].verified must be a boolean value` });
    }
  }

  next();
}

function validateUpdateEvidence(req, res, next) {
  const allowed = ['worker_id', 'session_id', 'image_url', 'verified'];
  const keys = Object.keys(req.body || {});

  if (keys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalid = keys.filter((key) => !allowed.includes(key));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalid.join(', ')}` });
  }

  if (req.body.worker_id !== undefined && (typeof req.body.worker_id !== 'string' || !isMongoObjectId(req.body.worker_id))) {
    return res.status(400).json({
      error: 'worker_id must be a valid auth-service user id (Mongo ObjectId string)'
    });
  }

  if (req.body.session_id !== undefined && !isUuid(req.body.session_id)) {
    return res.status(400).json({ error: 'session_id must be a UUID' });
  }

  if (req.body.image_url !== undefined && (typeof req.body.image_url !== 'string' || req.body.image_url.trim().length === 0)) {
    return res.status(400).json({ error: 'image_url must be a non-empty string' });
  }

  if (req.body.verified !== undefined && typeof req.body.verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be a boolean value' });
  }

  next();
}

function validateEvidenceVerifiedUpdate(req, res, next) {
  const keys = Object.keys(req.body || {});

  if (keys.length !== 1 || keys[0] !== 'verified') {
    return res.status(400).json({ error: 'Only verified field is allowed in this endpoint' });
  }

  if (typeof req.body.verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be a boolean value' });
  }

  next();
}

module.exports = {
  validateUuidParam,
  validateWorkerIdParam,
  validateWorkerAndSessionParams,
  validateCreateWorkSession,
  validateBulkWorkSessions,
  validateUpdateWorkSession,
  validateCreateEarning,
  validateBulkEarnings,
  validateUpdateEarning,
  validateCreateEvidence,
  validateBulkEvidence,
  validateUpdateEvidence,
  validateEvidenceVerifiedUpdate
};
