window.admissionsApi = (() => {
  const BASE_URL = '/api/v1';

  async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    if (!data.success) {
      throw new Error(data.message || 'Request returned unsuccessful response.');
    }
    return data;
  }

  async function getOnlineAdmissions() {
    const data = await request('/online-admissions');
    return data.admissions || [];
  }

  async function acceptAdmission(id, payload) {
    return request(`/online-admissions/accept/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async function rejectAdmission(id) {
    return request(`/online-admissions/reject/${id}`, {
      method: 'POST'
    });
  }

  return {
    getOnlineAdmissions,
    acceptAdmission,
    rejectAdmission
  };
})();
