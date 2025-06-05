import { apiRequest } from './apiRequest';

/**
 * Advanced Task API for progress and reminder management
 */
export const taskAdvancedAPI = {

  // Progress management
  updateTaskProgress: async (taskId, percentComplete) => {
    return await apiRequest(`/task_advanced/tasks/${taskId}/progress`, 'PUT', {
      percent_complete: percentComplete
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