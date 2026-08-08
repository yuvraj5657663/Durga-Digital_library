import api from './api';

export const announcementService = {
  getAnnouncements: async (params = {}) => {
    const response = await api.get('/admin/announcements', { params });
    return response.data;
  },

  createAnnouncement: async (data) => {
    const response = await api.post('/admin/announcements', data);
    return response.data.data;
  },

  updateAnnouncement: async (id, data) => {
    const response = await api.put(`/admin/announcements/${id}`, data);
    return response.data.data;
  },

  deleteAnnouncement: async (id) => {
    const response = await api.delete(`/admin/announcements/${id}`);
    return response.data.data;
  },
};
