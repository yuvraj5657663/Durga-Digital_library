import api from './api';

export const wifiSessionService = {
  getSessions: async (params = {}) => {
    const response = await api.get('/admin/wifi/sessions', { params });
    return response.data.data || response.data;
  },

  getSession: async (sessionId) => {
    const response = await api.get(`/admin/wifi/sessions/${sessionId}`);
    return response.data.data || response.data;
  },

  revoke: async (sessionId, reason = 'admin_action') => {
    const response = await api.post(`/admin/wifi/sessions/${sessionId}/revoke`, { reason });
    return response.data.data || response.data;
  },

  revokeAllForStudent: async (studentId, reason = 'admin_action') => {
    const response = await api.post(`/admin/wifi/students/${studentId}/sessions/revoke`, { reason });
    return response.data.data || response.data;
  },
};
