import { apiRequest } from './apiRequest';

/**
 * Analytics API for advanced project and user analytics
 */
export const analyticsAPI = {
  // Project analytics
  getProjectStats: async (projectId) => {
    return await apiRequest(`/analytics/projects/${projectId}/stats`);
  },

  getProjectHealth: async (projectId) => {
    return await apiRequest(`/analytics/projects/${projectId}/health`);
  },

  getResourceUtilization: async (projectId) => {
    return await apiRequest(`/analytics/projects/${projectId}/resources`);
  },

  // User analytics
  getUserDashboard: async (userId) => {
    return await apiRequest(`/analytics/users/${userId}/dashboard`);
  },

  getUserProductivity: async (userId, projectId = null) => {
    const url = projectId 
      ? `/analytics/users/${userId}/productivity?project_id=${projectId}`
      : `/analytics/users/${userId}/productivity`;
    return await apiRequest(url);
  }
}; 