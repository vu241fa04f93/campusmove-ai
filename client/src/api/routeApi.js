import { apiClient } from './apiClient';

export const routeApi = {
  getAll: async () => {
    const res = await apiClient.get('/routes');
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/routes/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient.post('/routes', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/routes/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/routes/${id}`);
    return res.data;
  },
};
