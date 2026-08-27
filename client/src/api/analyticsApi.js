import axios from 'axios';

const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const analyticsApi = {
  getOverview: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/overview`, getAuthHeaders());
    return response.data;
  },

  getFleet: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/fleet`, getAuthHeaders());
    return response.data;
  },

  getRoutes: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/routes`, getAuthHeaders());
    return response.data;
  },

  getComplaints: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/complaints`, getAuthHeaders());
    return response.data;
  },

  getIncidents: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/incidents`, getAuthHeaders());
    return response.data;
  },

  getPredictions: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/predictions`, getAuthHeaders());
    return response.data;
  },

  getTrends: async (range = '7d') => {
    const response = await axios.get(`${API_BASE_URL}/analytics/trends?range=${range}`, getAuthHeaders());
    return response.data;
  },

  getPilotReadiness: async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/pilot-readiness`, getAuthHeaders());
    return response.data;
  },
};
