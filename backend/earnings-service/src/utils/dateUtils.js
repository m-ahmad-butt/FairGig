function badRequestError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function parseDateOnly(value, fieldName) {
  if (typeof value !== 'string') {
    throw badRequestError(`${fieldName} must be a string in YYYY-MM-DD format`);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw badRequestError(`${fieldName} must be in YYYY-MM-DD format`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`${fieldName} is invalid`);
  }

  return parsed;
}

function parseTimestamp(value, fieldName) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`${fieldName} is invalid timestamp`);
  }

  return parsed;
}

module.exports = {
  parseDateOnly,
  parseTimestamp
};
