import api from './api';

export const attendanceService = {
  getAttendance: async (params = {}) => {
    const response = await api.get('/admin/attendance', { params });
    return response.data;
  },

  markAttendance: async (data) => {
    const response = await api.post('/admin/attendance', data);
    return response.data.data;
  },

  scanQrAttendance: async (data) => {
    const response = await api.post('/admin/attendance/scan', data);
    return response.data.data;
  },

  getAttendanceStats: async (params = {}) => {
    const response = await api.get('/admin/attendance/stats', { params });
    return response.data.data;
  },

  deleteAttendance: async (id) => {
    const response = await api.delete(`/admin/attendance/${id}`);
    return response.data.data;
  },
};
