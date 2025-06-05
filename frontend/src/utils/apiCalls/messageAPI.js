import { apiRequest } from './apiRequest.js';

export const messageAPI = {
  /**
   * Get messages for a specific task
   * @param {number} projectId - Project ID
   * @param {number} taskId - Task ID
   * @returns {Promise} - Messages list response
   */
  getTaskMessages: (projectId, taskId) => {
    return apiRequest(`/projects/${projectId}/tasks/${taskId}/messages`, 'GET', null, `task-messages-${taskId}`);
  },

  /**
   * Send a message to a specific task
   * @param {number} projectId - Project ID
   * @param {number} taskId - Task ID
   * @param {string} content - Message content
   * @returns {Promise} - Message creation response
   */
  sendTaskMessage: (projectId, taskId, content) => {
    return apiRequest(
      `/projects/${projectId}/tasks/${taskId}/messages`,
      'POST',
      { content },
      `task-message-send-${taskId}`
    );
  },

  /**
   * Get project messages
   * @param {number} projectId - Project ID
   * @returns {Promise} - Messages list response
   */
  getProjectMessages: (projectId) => {
    return apiRequest(`/projects/${projectId}/messages`, 'GET', null, `project-messages-${projectId}`);
  },

  /**
   * Send a message to a project
   * @param {number} projectId - Project ID
   * @param {string} content - Message content
   * @returns {Promise} - Message creation response
   */
  sendProjectMessage: (projectId, content) => {
    return apiRequest(
      `/projects/${projectId}/messages`,
      'POST',
      { content },
      `project-message-send-${projectId}`
    );
  }
};
