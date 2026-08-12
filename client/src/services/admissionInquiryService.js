import axios from 'axios';
import { API_BASE } from './api';

export const admissionInquiryService = {
  getAll: async (params = {}) => {
    const response = await axios.get(`${API_BASE}/admission/admissions`, { params });
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await axios.patch(`${API_BASE}/admission/admissions/${id}`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`${API_BASE}/admission/admissions/${id}`);
    return response.data;
  },

  getPendingCount: async () => {
    const response = await axios.get(`${API_BASE}/admission/admissions/pending-count`);
    return response.data;
  },

  create: async (data) => {
    const response = await axios.post(`${API_BASE}/admission/inquiry`, data);
    return response.data;
  }
};