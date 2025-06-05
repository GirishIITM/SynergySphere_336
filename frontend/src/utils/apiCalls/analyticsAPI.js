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

  getProjectRiskAssessment: async (projectId) => {
    return await apiRequest(`/analytics/projects/${projectId}/risk-assessment`);
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
  },

  // Advanced analytics
  getTrendAnalysis: async (projectId = null, days = 90) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    params.append('days', days);
    
    return await apiRequest(`/analytics/trends?${params.toString()}`);
  },

  getPerformancePrediction: async (projectId = null) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    
    return await apiRequest(`/analytics/performance-prediction?${params.toString()}`);
  },

  // Task analytics
  getTaskAnalytics: async (taskId) => {
    return await apiRequest(`/analytics/tasks/${taskId}/analytics`);
  },

  // Productivity analytics
  getProductivityAnalytics: async (days = 30) => {
    return await apiRequest(`/analytics/productivity?days=${days}`);
  },

  getProjectAnalytics: async () => {
    return await apiRequest('/analytics/projects');
  },

  getTeamAnalytics: async (projectId) => {
    return await apiRequest(`/analytics/team?project_id=${projectId}`);
  }
}; 