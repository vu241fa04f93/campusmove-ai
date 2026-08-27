import { apiClient } from './apiClient';

export const assistantApi = {
  /**
   * Send a natural language query to the AI Assistant
   * @param {string} message 
   * @param {Object} [context] 
   */
  sendMessage: async (message, context = {}) => {
    const res = await apiClient.post('/assistant/chat', { message, context });
    return res.data;
  },

  /**
   * Fetch recommended assistant suggestions & starter prompts
   */
  getSuggestions: async () => {
    const res = await apiClient.get('/assistant/suggestions');
    return res.data;
  },
};
