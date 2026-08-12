import api, { API_BASE } from './api';

export const notificationService = {
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get(`${API_BASE}/admin/notifications`, { params });
      console.log('Notifications response:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      // Return empty data structure on error
      return { notifications: [], unreadCount: 0, total: 0 };
    }
  },

  createTestNotification: async (data) => {
    try {
      const response = await api.post(`${API_BASE}/admin/notifications/test`, data);
      console.log('Test notification created:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Create test notification error:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.patch(`${API_BASE}/admin/notifications/read-all`);
      console.log('Mark all as read response:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await api.patch(`${API_BASE}/admin/notifications/${id}/read`);
      console.log('Mark as read response:', response.data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  },
};
