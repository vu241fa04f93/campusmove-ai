import { apiClient } from './apiClient';

export const busApi = {
  getAll: async () => {
    const res = await apiClient.get('/buses');
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/buses/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient.post('/buses', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/buses/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/buses/${id}`);
    return res.data;
  },
};
