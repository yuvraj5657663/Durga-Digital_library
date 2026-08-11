import api from './api';

export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/admin/notifications', { params });
    return response.data.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/admin/notifications/read-all');
    return response.data.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/admin/notifications/${id}/read`);
    return response.data.data;
  },
};
