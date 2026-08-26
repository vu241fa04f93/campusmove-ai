import { apiClient } from './apiClient';

export const tripApi = {
  planTrip: async (payload) => {
    const res = await apiClient.post('/trips/plan', payload);
    return res.data;
  },
  getSuggestions: async () => {
    const res = await apiClient.get('/trips/suggestions');
    return res.data;
  },
};
