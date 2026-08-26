import { apiClient } from './apiClient';

export const userApi = {
  getAll: async () => {
    const res = await apiClient.get('/users');
    return res.data;
  },

  updateRole: async (id, role) => {
    const res = await apiClient.put(`/users/${id}/role`, { role });
    return res.data;
  },
};
