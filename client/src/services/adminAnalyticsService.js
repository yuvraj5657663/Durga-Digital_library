import api from './api';

export const adminAnalyticsService = {
  ask: async (question) => {
    const response = await api.post('/admin/analytics/query', { question });
    return response.data.data;
  },
};
