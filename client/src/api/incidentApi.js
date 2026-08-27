import { apiClient } from './apiClient';

export const incidentApi = {
  /**
   * Report an incident (Driver / Admin)
   */
  create: async (data) => {
    const res = await apiClient.post('/incidents', data);
    return res.data;
  },

  /**
   * Get all incidents (Admin / Driver)
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },

  /**
   * Get incident by ID
   */
  getById: async (id) => {
    const res = await apiClient.get(`/incidents/${id}`);
    return res.data;
  },

  /**
   * Update incident (Admin)
   */
  update: async (id, data) => {
    const res = await apiClient.patch(`/incidents/${id}`, data);
    return res.data;
  },

  /**
   * Resolve incident (Admin)
   */
  resolve: async (id, data) => {
    const res = await apiClient.patch(`/incidents/${id}/resolve`, data);
    return res.data;
  },

  /**
   * Close incident (Admin)
   */
  close: async (id) => {
    const res = await apiClient.patch(`/incidents/${id}/close`);
    return res.data;
  },
};
