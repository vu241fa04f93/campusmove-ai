import { apiClient } from './apiClient';

export const complaintApi = {
  /**
   * Submit a new student complaint
   */
  create: async (data) => {
    const res = await apiClient.post('/complaints', data);
    return res.data;
  },

  /**
   * Get logged-in student's complaints
   */
  getMy: async (params = {}) => {
    const res = await apiClient.get('/complaints/my', { params });
    return res.data;
  },

  /**
   * Get all complaints (Admin)
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get('/complaints', { params });
    return res.data;
  },

  /**
   * Get single complaint by ID
   */
  getById: async (id) => {
    const res = await apiClient.get(`/complaints/${id}`);
    return res.data;
  },

  /**
   * Update complaint fields / status (Admin)
   */
  update: async (id, data) => {
    const res = await apiClient.patch(`/complaints/${id}`, data);
    return res.data;
  },

  /**
   * Resolve complaint (Admin)
   */
  resolve: async (id, data) => {
    const res = await apiClient.patch(`/complaints/${id}/resolve`, data);
    return res.data;
  },

  /**
   * Confirm complaint resolution (Student)
   */
  confirm: async (id, data = {}) => {
    const res = await apiClient.patch(`/complaints/${id}/confirm`, data);
    return res.data;
  },

  /**
   * Reopen resolved complaint (Student)
   */
  reopen: async (id, data) => {
    const res = await apiClient.patch(`/complaints/${id}/reopen`, data);
    return res.data;
  },
};
