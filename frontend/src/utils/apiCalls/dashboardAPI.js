import { apiRequest } from './apiRequest.js';

export const dashboardAPI = {
  getOverview: () => {
    return apiRequest('/dashboard/overview', 'GET', null, 'dashboard-overview');
  },

  getStats: () => {
    return apiRequest('/dashboard/stats', 'GET', null, 'dashboard-stats');
  }
};
