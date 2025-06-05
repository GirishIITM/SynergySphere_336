import { apiRequest } from './apiRequest.js';

export const notificationAPI = {
  /**
   * Get all notifications for the current user
   * @returns {Promise} - Notifications list response
   */
  getNotifications: () => {
    return apiRequest('/notifications', 'GET', null, 'notifications');
  },

  /**
   * Get notifications where the user is tagged/mentioned
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of notifications to fetch
   * @param {number} params.offset - Offset for pagination
   * @param {boolean} params.unread_only - Only fetch unread notifications
   * @returns {Promise} - Tagged notifications list response
   */
  getTaggedNotifications: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.unread_only) queryParams.append('unread_only', params.unread_only);
    
    const url = queryParams.toString() 
      ? `/notifications/tagged?${queryParams.toString()}`
      : '/notifications/tagged';
    
    return apiRequest(url, 'GET', null, 'tagged-notifications');
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId - Notification ID to mark as read
   * @returns {Promise} - Mark read response
   */
  markNotificationRead: (notificationId) => {
    return apiRequest(
      `/notifications/${notificationId}/read`, 
      'PUT', 
      null, 
      `mark-read-${notificationId}`
    );
  },

  /**
   * Mark all notifications as read
   * @param {string} type - Optional notification type filter ('tagged', 'assigned', 'general')
   * @returns {Promise} - Mark all read response
   */
  markAllNotificationsRead: (type = null) => {
    const url = type 
      ? `/notifications/mark-all-read?type=${type}`
      : '/notifications/mark-all-read';
    
    return apiRequest(url, 'PUT', null, 'mark-all-read');
  }
}; 