import api from './api';

export const admissionService = {
  getAdmissions: async (params = {}) => {
    const response = await api.get('/admin/admissions', { params });
    return response.data;
  },

  approveAdmission: async (id, data) => {
    const response = await api.post(`/admin/admissions/${id}/approve`, data);
    return response.data.data;
  },

  rejectAdmission: async (id, data = {}) => {
    const response = await api.post(`/admin/admissions/${id}/reject`, data);
    return response.data.data;
  },
};
