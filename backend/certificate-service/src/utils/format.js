const { createBadRequestError } = require('./errors');

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value) {
  return `Rs. ${toNumber(value).toLocaleString('en-PK')}`;
}

function formatDateForDisplay(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseDateOnly(value, fieldName) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw createBadRequestError(`${fieldName} is required`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw createBadRequestError(`${fieldName} must be in YYYY-MM-DD format`);
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw createBadRequestError(`${fieldName} is invalid`);
  }

  return parsed;
}

module.exports = {
  toNumber,
  formatCurrency,
  formatDateForDisplay,
  toIsoDate,
  parseDateOnly
};
