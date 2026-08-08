import api from './api';

export const membershipService = {
  renewMembership: async (data) => {
    const response = await api.post('/admin/memberships/renew', data);
    return response.data.data;
  },

  getMembershipHistory: async (studentId, params = {}) => {
    const response = await api.get(`/admin/memberships/${studentId}/history`, { params });
    return response.data;
  },

  getCurrentMembership: async (studentId) => {
    const response = await api.get(`/admin/memberships/${studentId}/current`);
    return response.data.data;
  },

  getExpiringSoon: async (params = {}) => {
    const response = await api.get('/admin/memberships/expiring', { params });
    return response.data.data;
  },
};
