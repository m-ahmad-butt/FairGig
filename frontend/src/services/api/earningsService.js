const API_URL = import.meta.env.VITE_API_GATEWAY_URL 
  ? `${import.meta.env.VITE_API_GATEWAY_URL}/earnings` 
  : 'http://localhost:8080/api/earnings';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class EarningsService {
  // Work Sessions
  async createWorkSession(data) {
    const response = await fetch(`${API_URL}/work-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create work session');
    }
    return result;
  }

  async bulkCreateWorkSessions(items) {
    const response = await fetch(`${API_URL}/work-sessions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ items })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create bulk work sessions');
    }
    return result;
  }

  async getWorkSessions(workerId) {
    const params = new URLSearchParams();
    if (workerId) params.append('worker_id', workerId);

    const response = await fetch(`${API_URL}/work-sessions?${params}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get work sessions');
    }
    return result;
  }

  // Earnings
  async createEarning(data) {
    const response = await fetch(`${API_URL}/earnings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create earning');
    }
    return result;
  }

  async bulkCreateEarnings(items) {
    const response = await fetch(`${API_URL}/earnings/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ items })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create bulk earnings');
    }
    return result;
  }

  // Evidence
  async createEvidence(data) {
    const response = await fetch(`${API_URL}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create evidence');
    }
    return result;
  }

  async bulkCreateEvidence(items) {
    const response = await fetch(`${API_URL}/evidence/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ items })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create bulk evidence');
    }
    return result;
  }

  // Presigned URL (if endpoint exists)
  async getPresignedUrl(sessionId, fileType) {
    const params = new URLSearchParams();
    params.append('session_id', sessionId);
    if (fileType) params.append('file_type', fileType);

    const response = await fetch(`${API_URL}/evidence/presigned-url?${params}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get presigned URL');
    }
    return result;
  }

  // Get earnings by worker
  async getEarningsByWorker(workerId) {
    const response = await fetch(`${API_URL}/earnings?worker_id=${workerId}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get earnings');
    }
    return result;
  }

  // Get all evidence (for verifier queue)
  async getAllEvidence() {
    const response = await fetch(`${API_URL}/evidence`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get evidence');
    }
    return result;
  }

  // Update evidence verification status
  async updateEvidence(evidenceId, data) {
    const response = await fetch(`${API_URL}/evidence/${evidenceId}/verified`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update evidence');
    }
    return result;
  }

  // Get evidence by ID
  async getEvidenceById(evidenceId) {
    const response = await fetch(`${API_URL}/evidence/${evidenceId}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get evidence');
    }
    return result;
  }

  // Get unverified evidence with details (for verifier queue)
  async getUnverifiedEvidenceDetailed() {
    const response = await fetch(`${API_URL}/evidence/unverified/detailed`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get unverified evidence');
    }
    return result;
  }

  // Get work session by ID
  async getWorkSessionById(sessionId) {
    const response = await fetch(`${API_URL}/work-sessions/${sessionId}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get work session');
    }
    return result;
  }

  // Get earning by session ID
  async getEarningBySession(sessionId) {
    const response = await fetch(`${API_URL}/earnings?session_id=${sessionId}`, {
      headers: getAuthHeaders()
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to get earning');
    }
    return result;
  }
}

export default new EarningsService();