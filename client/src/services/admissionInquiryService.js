import api from './api';

export const admissionInquiryService = {
  getAll: async (params = {}) => {
    console.log('Fetching admissions with params:', params);
    const response = await api.get('/admission/admissions', { params });
    console.log('Admissions response:', response.data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    console.log('Updating admission status:', id, status);
    const response = await api.patch(`/admission/admissions/${id}`, { status });
    console.log('Update response:', response.data);
    return response.data;
  },

  delete: async (id) => {
    console.log('Deleting admission:', id);
    const response = await api.delete(`/admission/admissions/${id}`);
    console.log('Delete response:', response.data);
    return response.data;
  },

  getPendingCount: async () => {
    console.log('Fetching pending count');
    const response = await api.get('/admission/admissions/pending-count');
    console.log('Pending count response:', response.data);
    return response.data;
  },

  create: async (data) => {
    console.log('Creating admission inquiry:', data);
    const response = await api.post('/admission/inquiry', data);
    console.log('Create response:', response.data);
    return response.data;
  },

  createInquiry: async (data) => {
    console.log('Creating admission inquiry (alias):', data);
    const response = await api.post('/admission/inquiry', data);
    console.log('Create response:', response.data);
    return response.data;
  }
};