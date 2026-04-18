const ANOMALY_SERVICE_BASE_URL =
  process.env.ANOMALY_SERVICE_INTERNAL_URL ||
  process.env.ANOMALY_SERVICE_URL ||
  'http://anomaly-service:8002';

const ANOMALY_TRIGGER_TIMEOUT_MS = Number(process.env.ANOMALY_TRIGGER_TIMEOUT_MS || 4000);

function buildCandidateBaseUrls() {
  const candidates = [ANOMALY_SERVICE_BASE_URL, 'http://localhost:8002'];

  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))].map(
    (baseUrl) => baseUrl.replace(/\/$/, '')
  );
}

async function safeReadError(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return JSON.stringify(json);
    }

    return (await response.text()).trim();
  } catch (error) {
    return '';
  }
}

async function triggerAnomalyDetection({ worker_id, session_id, evidence_id }) {
  const payload = {
    worker_id,
    session_id,
    evidence_id,
    verified: true
  };

  const candidateBaseUrls = buildCandidateBaseUrls();
  let lastError = null;

  for (const baseUrl of candidateBaseUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANOMALY_TRIGGER_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/anomalies/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-name': 'earnings-service'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (response.ok) {
        return;
      }

      const details = await safeReadError(response);
      lastError = new Error(
        `anomaly-service trigger failed (${response.status})${details ? `: ${details}` : ''}`
      );
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('anomaly-service trigger failed for unknown reason');
}

module.exports = {
  triggerAnomalyDetection
};