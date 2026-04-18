const API_URL = import.meta.env.VITE_API_GATEWAY_URL
  ? `${import.meta.env.VITE_API_GATEWAY_URL}/certificate`
  : 'http://localhost:8080/api/certificate';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const buildCertificateQuery = (workerId, options) => {
  const params = new URLSearchParams();
  params.append('worker_id', workerId);

  if (typeof options === 'string' || typeof options === 'number') {
    params.append('year', String(options));
    return params;
  }

  const filters = options || {};
  if (filters.year) {
    params.append('year', String(filters.year));
  }
  if (filters.fromDate) {
    params.append('from_date', String(filters.fromDate));
  }
  if (filters.toDate) {
    params.append('to_date', String(filters.toDate));
  }
  if (filters.workerName) {
    params.append('worker_name', String(filters.workerName));
  }

  return params;
};

class CertificateService {
  async getIncomeCertificate(workerId, options) {
    const params = buildCertificateQuery(workerId, options);

    const response = await fetch(`${API_URL}/income-certificate?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch income certificate');
    }

    return result;
  }

  async getIncomeCertificateHtml(workerId, options) {
    const params = buildCertificateQuery(workerId, options);

    const response = await fetch(`${API_URL}/income-certificate/html?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    const result = await response.text();
    if (!response.ok) {
      let message = 'Failed to fetch income certificate html';
      try {
        const parsed = JSON.parse(result);
        if (parsed?.error) {
          message = parsed.error;
        }
      } catch {
        // Response was not JSON, fall back to default error message.
      }

      throw new Error(message);
    }

    return result;
  }
}

export default new CertificateService();
