import { apiClient } from './apiClient.js';

export const predictionApi = {
  /**
   * Get ML Refined ETA with Base ETA comparison for a bus
   * @param {string} busId
   * @param {string} [stopId]
   */
  async getBusEta(busId, stopId) {
    const params = stopId ? { stopId } : {};
    const res = await apiClient.get(`/predictions/eta/${busId}`, { params });
    return res.data;
  },

  /**
   * Get ML Crowd & Occupancy Estimation for a bus
   * @param {string} busId
   */
  async getBusCrowd(busId) {
    const res = await apiClient.get(`/predictions/crowd/${busId}`);
    return res.data;
  },

  /**
   * Get Transport Demand Forecast across campus routes/stops
   * @param {Object} [filters] { routeId, stopId, date, hour }
   */
  async getDemandForecast(filters = {}) {
    const res = await apiClient.get('/predictions/demand', { params: filters });
    return res.data;
  },

  /**
   * Get Fleet-wide Prediction Overview and Model Accuracy Metrics
   */
  async getSummary() {
    const res = await apiClient.get('/predictions/summary');
    return res.data;
  },

  /**
   * Trigger ML model re-training (Admin only)
   */
  async retrainModels() {
    const res = await apiClient.post('/predictions/train');
    return res.data;
  },
};
