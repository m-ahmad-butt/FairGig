const GATEWAY_API_BASE =
  import.meta.env.VITE_API_URL || "https://s-api-gateway.duckdns.org";
const API_URL = `${GATEWAY_API_BASE}/api/analytics`;

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class AnalyticsService {
  async getAdvocateDashboard(params = {}) {
    const query = new URLSearchParams();

    if (params.range !== undefined) {
      query.set("range", String(params.range));
    }

    if (params.max_clusters !== undefined) {
      query.set("max_clusters", String(params.max_clusters));
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";

    const response = await fetch(`${API_URL}/advocate/dashboard${suffix}`, {
      headers: getAuthHeaders(),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.detail || result.error || "Failed to load advocate analytics",
      );
    }

    return result;
  }
}

export default new AnalyticsService();
