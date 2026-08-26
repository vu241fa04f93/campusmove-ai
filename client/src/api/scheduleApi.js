import { apiClient } from './apiClient';

export const scheduleApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get('/schedules', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/schedules/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await apiClient.post('/schedules', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await apiClient.put(`/schedules/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`/schedules/${id}`);
    return res.data;
  },
};
