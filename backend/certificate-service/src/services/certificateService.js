const { createBadRequestError } = require('../utils/errors');
const { toNumber, toIsoDate, parseDateOnly } = require('../utils/format');
const { fetchEarningsData } = require('./earningsClient');

function resolveDateRange(query) {
  const fromDateRaw = String(query.from_date || '').trim();
  const toDateRaw = String(query.to_date || '').trim();

  if (fromDateRaw || toDateRaw) {
    if (!fromDateRaw || !toDateRaw) {
      throw createBadRequestError('from_date and to_date must both be provided');
    }

    const fromDate = parseDateOnly(fromDateRaw, 'from_date');
    const toDateStart = parseDateOnly(toDateRaw, 'to_date');
    const toDate = new Date(toDateStart);
    toDate.setUTCHours(23, 59, 59, 999);

    if (toDate < fromDate) {
      throw createBadRequestError('to_date must be on or after from_date');
    }

    return {
      fromDate,
      toDate,
      fromDateIso: toIsoDate(fromDate),
      toDateIso: toIsoDate(toDate),
      rangeLabel: `${toIsoDate(fromDate)} to ${toIsoDate(toDate)}`
    };
  }

  const currentYear = new Date().getFullYear();
  const requestedYear = Number(query.year || currentYear);

  if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2100) {
    throw createBadRequestError('year must be a valid 4-digit year');
  }

  const fromDate = new Date(Date.UTC(requestedYear, 0, 1, 0, 0, 0, 0));
  const toDate = new Date(Date.UTC(requestedYear, 11, 31, 23, 59, 59, 999));

  return {
    fromDate,
    toDate,
    fromDateIso: toIsoDate(fromDate),
    toDateIso: toIsoDate(toDate),
    rangeLabel: `Fiscal Year ${requestedYear}`
  };
}

function buildPeriodBreakdown(verifiedSessions) {
  const periodMap = new Map();

  verifiedSessions.forEach((session) => {
    const sessionDate = new Date(session.session_date);
    const periodKey = `${sessionDate.getUTCFullYear()}-${String(sessionDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = sessionDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        key: periodKey,
        label,
        sessions: 0,
        hours: 0,
        gross: 0,
        net: 0
      });
    }

    const bucket = periodMap.get(periodKey);
    bucket.sessions += 1;
    bucket.hours += toNumber(session.hours_worked);
    bucket.gross += toNumber(session.earning?.gross_earned);
    bucket.net += toNumber(session.earning?.net_received);
  });

  return Array.from(periodMap.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((bucket) => ({
      ...bucket,
      hours: Number(bucket.hours.toFixed(2)),
      gross: Number(bucket.gross.toFixed(2)),
      net: Number(bucket.net.toFixed(2))
    }));
}

function buildCertificateId(workerId, year, generatedAtIso) {
  const compactTimestamp = generatedAtIso.replace(/\D/g, '').slice(0, 14);
  return `FG-${year}-${String(workerId).slice(0, 8).toUpperCase()}-${compactTimestamp}`;
}

async function generateCertificateData(workerId, query) {
  const range = resolveDateRange(query || {});

  const [sessions, earnings, verifiedEvidence] = await Promise.all([
    fetchEarningsData(`/work-sessions?worker_id=${encodeURIComponent(workerId)}`),
    fetchEarningsData(`/earnings?worker_id=${encodeURIComponent(workerId)}`),
    fetchEarningsData(`/evidence?worker_id=${encodeURIComponent(workerId)}&verified=true`)
  ]);

  const earningBySessionId = new Map(
    (Array.isArray(earnings) ? earnings : []).map((item) => [item.session_id, item])
  );
  const verifiedSessionIds = new Set(
    (Array.isArray(verifiedEvidence) ? verifiedEvidence : []).map((item) => item.session_id)
  );

  const verifiedSessions = (Array.isArray(sessions) ? sessions : [])
    .map((session) => {
      const earning = earningBySessionId.get(session.id);
      if (!earning || !verifiedSessionIds.has(session.id)) {
        return null;
      }

      const sessionDate = new Date(session.session_date);
      if (
        Number.isNaN(sessionDate.getTime()) ||
        sessionDate < range.fromDate ||
        sessionDate > range.toDate
      ) {
        return null;
      }

      return {
        ...session,
        earning: {
          gross_earned: toNumber(earning.gross_earned),
          platform_deductions: toNumber(earning.platform_deductions),
          net_received: toNumber(earning.net_received)
        }
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(left.session_date) - new Date(right.session_date));

  const totals = verifiedSessions.reduce(
    (accumulator, session) => {
      accumulator.total_sessions += 1;
      accumulator.total_hours += toNumber(session.hours_worked);
      accumulator.total_gross += toNumber(session.earning?.gross_earned);
      accumulator.total_net += toNumber(session.earning?.net_received);
      return accumulator;
    },
    {
      total_sessions: 0,
      total_hours: 0,
      total_gross: 0,
      total_net: 0
    }
  );

  const generatedAt = new Date().toISOString();

  return {
    worker_id: workerId,
    from_date: range.fromDateIso,
    to_date: range.toDateIso,
    range_label: range.rangeLabel,
    generated_at: generatedAt,
    certificate_id: buildCertificateId(workerId, range.fromDateIso.slice(0, 4), generatedAt),
    summary: {
      total_sessions: totals.total_sessions,
      total_hours: Number(totals.total_hours.toFixed(2)),
      total_gross: Number(totals.total_gross.toFixed(2)),
      total_net: Number(totals.total_net.toFixed(2))
    },
    period_breakdown: buildPeriodBreakdown(verifiedSessions),
    sessions: verifiedSessions
  };
}

module.exports = {
  generateCertificateData
};
