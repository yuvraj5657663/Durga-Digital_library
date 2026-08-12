import api from './api';

export const admissionInquiryService = {
  getAll: async (params = {}) => {
    const response = await api.get('/admission/admissions', { params });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/admission/admissions/${id}`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admission/admissions/${id}`);
    return response.data;
  },

  getPendingCount: async () => {
    const response = await api.get('/admission/admissions/pending-count');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admission/inquiry', data);
    return response.data;
  },

  createInquiry: async (data) => {
    const response = await api.post('/admission/inquiry', data);
    return response.data;
  }
};