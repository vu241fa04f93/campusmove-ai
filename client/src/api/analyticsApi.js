import { apiClient } from './apiClient';

export const analyticsApi = {
  getOverview: async () => {
    const response = await apiClient.get('/analytics/overview');
    return response.data;
  },

  getFleet: async () => {
    const response = await apiClient.get('/analytics/fleet');
    return response.data;
  },

  getRoutes: async () => {
    const response = await apiClient.get('/analytics/routes');
    return response.data;
  },

  getComplaints: async () => {
    const response = await apiClient.get('/analytics/complaints');
    return response.data;
  },

  getIncidents: async () => {
    const response = await apiClient.get('/analytics/incidents');
    return response.data;
  },

  getPredictions: async () => {
    const response = await apiClient.get('/analytics/predictions');
    return response.data;
  },

  getTrends: async (range = '7d') => {
    const response = await apiClient.get(`/analytics/trends?range=${range}`);
    return response.data;
  },

  getPilotReadiness: async () => {
    const response = await apiClient.get('/analytics/pilot-readiness');
    return response.data;
  },
};

