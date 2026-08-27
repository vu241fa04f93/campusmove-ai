import { apiClient } from './apiClient';

export const alertApi = {
  /**
   * Fetch active alerts with optional unreadOnly or filters
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get('/alerts', { params });
    return res.data;
  },

  /**
   * Get single alert
   */
  getById: async (id) => {
    const res = await apiClient.get(`/alerts/${id}`);
    return res.data;
  },

  /**
   * Mark alert as read
   */
  markAsRead: async (id) => {
    const res = await apiClient.patch(`/alerts/${id}/read`);
    return res.data;
  },

  /**
   * Mark all alerts as read
   */
  markAllAsRead: async () => {
    const res = await apiClient.post('/alerts/mark-all-read');
    return res.data;
  },

  /**
   * Create alert (Admin / Driver)
   */
  create: async (data) => {
    const res = await apiClient.post('/alerts', data);
    return res.data;
  },

  /**
   * Get student alert notification preferences
   */
  getPreferences: async () => {
    const res = await apiClient.get('/alerts/preferences');
    return res.data;
  },

  /**
   * Update student alert notification preferences
   */
  updatePreferences: async (data) => {
    const res = await apiClient.put('/alerts/preferences', data);
    return res.data;
  },
};
