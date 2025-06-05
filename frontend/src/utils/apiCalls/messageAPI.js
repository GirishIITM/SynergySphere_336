import { apiRequest } from './apiRequest.js';

export const messageAPI = {
  /**
   * Get messages for a specific task
   * @param {number} projectId - Project ID
   * @param {number} taskId - Task ID
   * @returns {Promise} - Messages list response
   */
  getTaskMessages: (projectId, taskId) => {
    return apiRequest(`/projects/${projectId}/tasks/${taskId}/messages`, 'GET', null, `task-messages-${taskId}`)
      .then(result => {
        // Ensure we return an array
        if (Array.isArray(result)) {
          return result;
        }
        if (result && Array.isArray(result.messages)) {
          return result.messages;
        }
        return [];
      })
      .catch(error => {
        console.error('Error fetching task messages:', error);
        return [];
      });
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
    return apiRequest(`/projects/${projectId}/messages`, 'GET', null, `project-messages-${projectId}`)
      .then(result => {
        // Ensure we return an array
        if (Array.isArray(result)) {
          return result;
        }
        if (result && Array.isArray(result.messages)) {
          return result.messages;
        }
        return [];
      })
      .catch(error => {
        console.error('Error fetching project messages:', error);
        return [];
      });
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
  },

  /**
   * Get project members for mentions
   * @param {number} projectId - Project ID
   * @returns {Promise} - Project members list
   */
  getProjectMembers: (projectId) => {
    return apiRequest(`/projects/${projectId}/members`, 'GET', null, `project-members-${projectId}`)
      .then(result => {
        // Ensure we return an array
        if (result && Array.isArray(result.members)) {
          return result.members;
        }
        if (Array.isArray(result)) {
          return result;
        }
        return [];
      })
      .catch(error => {
        console.error('Error fetching project members:', error);
        return [];
      });
  }
};
