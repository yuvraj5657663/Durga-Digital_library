import api from './api';

export const studentService = {
  getStudents: async (params = {}) => {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  getStudent: async (id) => {
    const response = await api.get(`/admin/students/${id}`);
    return response.data.data;
  },

  createStudent: async (data) => {
    const response = await api.post('/admin/students', data);
    return response.data.data;
  },

  updateStudent: async (id, data) => {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data.data;
  },

  deactivateStudent: async (id) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data.data;
  },

  getDashboardStats: async (params = {}) => {
    const response = await api.get('/admin/stats', { params });
    return response.data.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};
