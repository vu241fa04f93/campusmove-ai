import { apiClient } from './apiClient';

export const stopApi = {
  getAll: async () => {
    const res = await apiClient.get('/stops');
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/stops/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient.post('/stops', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/stops/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/stops/${id}`);
    return res.data;
  },
};
