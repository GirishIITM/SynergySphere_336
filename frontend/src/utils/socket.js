/**
 * Socket.IO client configuration and utilities for real-time task chat.
 * 
 * Provides connection management, authentication, and event handlers
 * for seamless real-time communication within tasks.
 */

import { io } from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.authToken = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second delay
        
        // Event listeners storage
        this.eventListeners = new Map();
    }

    /**
     * Initialize Socket.IO connection with authentication.
     * 
     * @param {string} token - JWT authentication token
     * @param {string} baseUrl - Backend base URL (defaults to localhost:5000)
     */
    connect(token, baseUrl = 'http://localhost:5000') {
        if (this.socket && this.isConnected) {
            console.log('Socket already connected');
            return;
        }

        this.authToken = token;
        
        this.socket = io(baseUrl, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay
        });

        this.setupEventListeners();
    }

    /**
     * Set up core Socket.IO event listeners.
     */
    setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Socket.IO connected successfully');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000; // Reset delay
            
            // Trigger custom connect handlers
            this.emit('socket_connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket.IO disconnected:', reason);
            this.isConnected = false;
            
            // Trigger custom disconnect handlers
            this.emit('socket_disconnected', { reason });
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                this.emit('socket_connection_failed', { error, attempts: this.reconnectAttempts });
            } else {
                // Exponential backoff
                this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
            }
        });

        this.socket.on('connection_status', (data) => {
            console.log('Connection status:', data);
        });

        this.socket.on('error', (error) => {
            console.error('Socket.IO error:', error);
            this.emit('socket_error', error);
        });
    }

    /**
     * Disconnect from Socket.IO server.
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.authToken = null;
            
            // Clear all event listeners
            this.eventListeners.clear();
            
            console.log('Socket.IO disconnected manually');
        }
    }

    /**
     * Join a task chat room.
     * 
     * @param {number} taskId - ID of the task to join chat for
     * @returns {Promise} Promise that resolves when room is joined
     */
    joinTaskChat(taskId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            // Set up one-time listeners for the response
            const successHandler = (data) => {
                console.log('Joined task chat:', data);
                resolve(data);
            };

            const errorHandler = (error) => {
                console.error('Failed to join task chat:', error);
                reject(new Error(error.message || 'Failed to join task chat'));
            };

            this.socket.once('joined_task_chat', successHandler);
            this.socket.once('error', errorHandler);

            // Emit join request
            this.socket.emit('join_task_chat', {
                task_id: taskId,
                token: this.authToken
            });

            // Set timeout for response
            setTimeout(() => {
                this.socket.off('joined_task_chat', successHandler);
                this.socket.off('error', errorHandler);
                reject(new Error('Join task chat timeout'));
            }, 10000);
        });
    }

    /**
     * Leave a task chat room.
     * 
     * @param {number} taskId - ID of the task to leave chat for
     */
    leaveTaskChat(taskId) {
        if (!this.socket || !this.isConnected) {
            console.warn('Socket not connected, cannot leave task chat');
            return;
        }

        this.socket.emit('leave_task_chat', {
            task_id: taskId,
            token: this.authToken
        });
    }

    /**
     * Send a message to a task chat.
     * 
     * @param {number} taskId - ID of the task
     * @param {string} content - Message content
     */
    sendTaskMessage(taskId, content) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Socket not connected');
        }

        if (!content.trim()) {
            throw new Error('Message content cannot be empty');
        }

        this.socket.emit('send_task_message', {
            task_id: taskId,
            content: content.trim(),
            token: this.authToken
        });
    }

    /**
     * Send typing start indicator.
     * 
     * @param {number} taskId - ID of the task
     */
    sendTypingStart(taskId) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('typing_start', {
            task_id: taskId,
            token: this.authToken
        });
    }

    /**
     * Send typing stop indicator.
     * 
     * @param {number} taskId - ID of the task
     */
    sendTypingStop(taskId) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('typing_stop', {
            task_id: taskId,
            token: this.authToken
        });
    }

    /**
     * Get historical messages for a task.
     * 
     * @param {number} taskId - ID of the task
     * @param {number} limit - Maximum number of messages
     * @param {number} offset - Number of messages to skip
     */
    getTaskMessages(taskId, limit = 50, offset = 0) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Socket not connected');
        }

        this.socket.emit('get_task_messages', {
            task_id: taskId,
            limit,
            offset,
            token: this.authToken
        });
    }

    /**
     * Add event listener for Socket.IO events.
     * 
     * @param {string} event - Event name
     * @param {function} handler - Event handler function
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(handler);

        // Also register with socket if available
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }

    /**
     * Remove event listener.
     * 
     * @param {string} event - Event name
     * @param {function} handler - Event handler function
     */
    off(event, handler) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(handler);
        }

        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    /**
     * Emit custom events to registered listeners.
     * 
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Check if socket is connected.
     * 
     * @returns {boolean} Connection status
     */
    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }

    /**
     * Get current socket instance.
     * 
     * @returns {Socket|null} Socket.IO instance
     */
    getSocket() {
        return this.socket;
    }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager; 