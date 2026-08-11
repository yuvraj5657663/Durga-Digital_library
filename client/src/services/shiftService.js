import api from './api';

export const shiftService = {
  getShifts: async () => {
    const response = await api.get('/admin/shifts');
    return response.data.data;
  },
};
