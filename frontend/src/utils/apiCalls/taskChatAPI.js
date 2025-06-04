/**
 * Task Chat API utilities for REST endpoints.
 * 
 * Provides HTTP-based fallback for task messaging when Socket.IO is unavailable,
 * and utilities for fetching chat history, participants, and statistics.
 */

import { apiRequest } from './apiRequest';

/**
 * Get messages for a specific task.
 * 
 * @param {number} taskId - ID of the task
 * @param {number} limit - Maximum number of messages (default: 50)
 * @param {number} offset - Number of messages to skip (default: 0)
 * @returns {Promise} Promise resolving to messages data
 */
export const getTaskMessages = async (taskId, limit = 50, offset = 0) => {
    try {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });
        
        const response = await apiRequest(
            `tasks/${taskId}/messages?${params}`,
            'GET'
        );
        
        return response;
    } catch (error) {
        console.error('Error fetching task messages:', error);
        throw error;
    }
};

/**
 * Send a message to a task chat.
 * 
 * @param {number} taskId - ID of the task
 * @param {string} content - Message content
 * @returns {Promise} Promise resolving to created message data
 */
export const sendTaskMessage = async (taskId, content) => {
    try {
        if (!content?.trim()) {
            throw new Error('Message content cannot be empty');
        }
        
        const response = await apiRequest(
            `tasks/${taskId}/messages`,
            'POST',
            { content: content.trim() }
        );
        
        return response;
    } catch (error) {
        console.error('Error sending task message:', error);
        throw error;
    }
};

/**
 * Get list of users who can participate in task chat.
 * 
 * @param {number} taskId - ID of the task
 * @returns {Promise} Promise resolving to participants data
 */
export const getTaskChatParticipants = async (taskId) => {
    try {
        const response = await apiRequest(
            `tasks/${taskId}/chat/participants`,
            'GET'
        );
        
        return response;
    } catch (error) {
        console.error('Error fetching task chat participants:', error);
        throw error;
    }
};

/**
 * Get chat statistics for a task.
 * 
 * @param {number} taskId - ID of the task
 * @returns {Promise} Promise resolving to chat statistics
 */
export const getTaskChatStats = async (taskId) => {
    try {
        const response = await apiRequest(
            `tasks/${taskId}/chat/stats`,
            'GET'
        );
        
        return response;
    } catch (error) {
        console.error('Error fetching task chat stats:', error);
        throw error;
    }
};

/**
 * Load more messages with pagination support.
 * 
 * @param {number} taskId - ID of the task
 * @param {number} currentMessageCount - Current number of messages loaded
 * @param {number} pageSize - Number of messages to load per page
 * @returns {Promise} Promise resolving to additional messages
 */
export const loadMoreTaskMessages = async (taskId, currentMessageCount = 0, pageSize = 20) => {
    try {
        return await getTaskMessages(taskId, pageSize, currentMessageCount);
    } catch (error) {
        console.error('Error loading more task messages:', error);
        throw error;
    }
};

/**
 * Search messages within a task chat.
 * 
 * @param {number} taskId - ID of the task
 * @param {string} searchQuery - Search query string
 * @param {number} limit - Maximum number of results
 * @returns {Promise} Promise resolving to search results
 */
export const searchTaskMessages = async (taskId, searchQuery, limit = 20) => {
    try {
        // Note: This would require backend implementation
        // For now, we'll get all messages and filter client-side
        const allMessages = await getTaskMessages(taskId, 1000); // Get a large number
        
        const searchResults = allMessages.messages.filter(message =>
            message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            message.username.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, limit);
        
        return {
            ...allMessages,
            messages: searchResults,
            search_query: searchQuery,
            total_results: searchResults.length
        };
    } catch (error) {
        console.error('Error searching task messages:', error);
        throw error;
    }
};

/**
 * Check if user has permission to participate in task chat.
 * 
 * @param {number} taskId - ID of the task
 * @returns {Promise<boolean>} Promise resolving to permission status
 */
export const canParticipateInTaskChat = async (taskId) => {
    try {
        await getTaskChatParticipants(taskId);
        return true;
    } catch (error) {
        if (error.message?.includes('access denied') || error.message?.includes('403')) {
            return false;
        }
        throw error;
    }
};

/**
 * Get task chat summary data.
 * 
 * @param {number} taskId - ID of the task
 * @returns {Promise} Promise resolving to chat summary
 */
export const getTaskChatSummary = async (taskId) => {
    try {
        const [stats, participants] = await Promise.all([
            getTaskChatStats(taskId),
            getTaskChatParticipants(taskId)
        ]);
        
        return {
            task_id: taskId,
            message_count: stats.message_count,
            has_chat: stats.has_chat,
            participant_count: participants.count,
            participants: participants.participants
        };
    } catch (error) {
        console.error('Error fetching task chat summary:', error);
        throw error;
    }
}; 