const EARNINGS_SERVICE_URL = process.env.EARNINGS_SERVICE_URL || 'http://earnings-service:4002';

async function fetchEarningsData(path) {
  const baseCandidates = [...new Set([EARNINGS_SERVICE_URL, 'http://localhost:4002'].filter(Boolean))];
  let lastError = null;

  for (const baseUrl of baseCandidates) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) {
        lastError = new Error(`Earnings service responded with ${response.status}`);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to fetch data from earnings-service');
}

module.exports = {
  fetchEarningsData
};
