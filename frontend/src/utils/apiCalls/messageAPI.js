import { apiRequest } from './apiRequest.js';
import { projectAPI } from './projectAPI.js';

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
   * Get project members - delegates to projectAPI to avoid duplication
   * @param {number} projectId - Project ID
   * @returns {Promise} - Project members list response
   */
  getProjectMembers: (projectId) => {
    return projectAPI.getProjectMembers(projectId)
      .then(result => {
        // Return just the members array for backward compatibility
        return result.members || [];
      })
      .catch(error => {
        console.error('Error fetching project members:', error);
        return [];
      });
  },

  /**
   * Add member to project - delegates to projectAPI
   * @param {number} projectId - Project ID
   * @param {number} userId - User ID to add
   * @param {string} role - Member role (optional)
   * @returns {Promise} - Add member response
   */
  addProjectMember: (projectId, userId, role = 'member') => {
    return projectAPI.addProjectMember(projectId, { user_id: userId, role });
  },

  /**
   * Remove member from project - delegates to projectAPI
   * @param {number} projectId - Project ID
   * @param {number} userId - User ID to remove
   * @returns {Promise} - Remove member response
   */
  removeProjectMember: (projectId, userId) => {
    return projectAPI.removeProjectMember(projectId, userId);
  }
};
