import api from './api';

export const renewalService = {
  createRenewalRequest: async (data) => {
    const response = await api.post('/student/renewal/request', data);
    return response.data.data;
  },

  getRenewalStatus: async () => {
    const response = await api.get('/student/renewal/status');
    return response.data.data;
  },

  getRenewalRequests: async (params = {}) => {
    const response = await api.get('/admin/renewal/requests', { params });
    return response.data;
  },

  approveRenewalRequest: async (requestId, adminNotes) => {
    const response = await api.post(`/admin/renewal/${requestId}/approve`, { adminNotes });
    return response.data.data;
  },

  rejectRenewalRequest: async (requestId, rejectionReason) => {
    const response = await api.post(`/admin/renewal/${requestId}/reject`, { rejectionReason });
    return response.data.data;
  },

  deleteRenewalRequest: async (requestId) => {
    const response = await api.delete(`/admin/renewal/${requestId}`);
    return response.data.data;
  }
};