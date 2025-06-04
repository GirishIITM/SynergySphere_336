import { apiRequest } from './apiRequest';

/**
 * Advanced Task API for prioritization and deadline management
 */
export const taskAdvancedAPI = {
  // Priority management
  getPrioritizedTasks: async (projectId) => {
    return await apiRequest(`/task_advanced/projects/${projectId}/tasks/prioritized`);
  },

  recalculatePriorityScores: async (userId) => {
    return await apiRequest(`/task_advanced/users/${userId}/priority_scores`, 'POST');
  },

  // Progress management
  updateTaskProgress: async (taskId, percentComplete) => {
    return await apiRequest(`/task_advanced/tasks/${taskId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percent_complete: percentComplete })
    });
  },

  // Reminder management
  triggerReminderCheck: async (userId) => {
    return await apiRequest(`/task_advanced/users/${userId}/reminders/check`, 'POST');
  },

  scheduleTaskReminders: async (taskId) => {
    return await apiRequest(`/task_advanced/tasks/${taskId}/reminders/schedule`, 'POST');
  }
};