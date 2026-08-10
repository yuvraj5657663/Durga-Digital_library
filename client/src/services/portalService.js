import api from './api';

export const portalService = {
  getDashboard: async () => {
    const response = await api.get('/student/dashboard');
    return response.data.data;
  },

  getProfile: async () => {
    const response = await api.get('/student/profile');
    return response.data.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/student/profile', data);
    return response.data.data;
  },

  getIdCard: async (format = 'json') => {
    const response = await api.get('/student/id-card', { 
      params: { format },
      responseType: format === 'pdf' ? 'blob' : 'json'
    });
    return response.data;
  },

  getMembership: async () => {
    const response = await api.get('/student/membership');
    return response.data.data;
  },

  getAttendance: async (params = {}) => {
    const response = await api.get('/student/attendance', { params });
    return response.data;
  },

  selfCheckIn: async () => {
    const response = await api.post('/student/attendance/check-in');
    return response.data.data;
  },

  selfCheckOut: async () => {
    const response = await api.post('/student/attendance/check-out');
    return response.data.data;
  },

  getPayments: async (params = {}) => {
    const response = await api.get('/student/payments', { params });
    return response.data;
  },

  getReceipt: async (paymentId) => {
    const response = await api.get(`/student/receipts/${paymentId}`);
    return response.data.data;
  },

  getNotifications: async (params = {}) => {
    const response = await api.get('/student/notifications', { params });
    return response.data;
  },

  markNotificationsRead: async (notificationIds = []) => {
    const response = await api.post('/student/notifications/read', { notificationIds });
    return response.data.data;
  },

  getAnnouncements: async () => {
    const response = await api.get('/student/announcements');
    return response.data;
  },
};
