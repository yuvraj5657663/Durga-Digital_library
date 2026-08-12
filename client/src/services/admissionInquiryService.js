import api, { API_BASE } from './api';

export const admissionInquiryService = {
  getAll: async (params = {}) => {
    const response = await api.get(`${API_BASE}/admission/admissions`, { params });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`${API_BASE}/admission/admissions/${id}`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`${API_BASE}/admission/admissions/${id}`);
    return response.data;
  },

  getPendingCount: async () => {
    const response = await api.get(`${API_BASE}/admission/admissions/pending-count`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(`${API_BASE}/admission/inquiry`, data);
    return response.data;
  },

  createInquiry: async (data) => {
    const response = await api.post(`${API_BASE}/admission/inquiry`, data);
    return response.data;
  }
};