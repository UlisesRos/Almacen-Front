import api from './axios';

export const salesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/sales', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },

  getToday: async () => {
    const response = await api.get('/sales/today');
    return response.data;
  },

  getStats: async (period = 'today') => {
    const response = await api.get('/sales/stats/summary', { params: { period } });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/sales', data);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.delete(`/sales/${id}`);
    return response.data;
  }
};
