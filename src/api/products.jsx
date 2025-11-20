import api from './axios';

export const productsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getByBarcode: async (barcode) => {
    const response = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/products/low-stock');
    return response.data;
  },

  getNearExpiration: async () => {
    const response = await api.get('/products/near-expiration');
    return response.data;
  },

  getExpired: async () => {
    const response = await api.get('/products/expired');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  updateStock: async (id, data) => {
    const response = await api.patch(`/products/${id}/stock`, data);
    return response.data;
  },

  import: async (products) => {
    const response = await api.post('/products/import', { products });
    return response.data;
  }
};
