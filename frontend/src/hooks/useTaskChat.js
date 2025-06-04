/**
 * React hook for managing task chat functionality.
 * 
 * Provides state management, Socket.IO integration, and utilities
 * for real-time task communication with fallback to REST API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import socketManager from '../utils/socket';
import { 
    getTaskMessages, 
    sendTaskMessage, 
    getTaskChatParticipants,
    canParticipateInTaskChat 
} from '../utils/apiCalls/taskChatAPI';

/**
 * Hook for managing task chat functionality.
 * 
 * @param {number} taskId - ID of the task for chat
 * @param {string} authToken - Authentication token
 * @param {boolean} autoConnect - Whether to auto-connect to chat (default: true)
 * @returns {object} Chat state and methods
 */
export const useTaskChat = (taskId, authToken, autoConnect = true) => {
    // Chat state
    const [messages, setMessages] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [error, setError] = useState(null);
    
    // Real-time state
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    
    // Message input state
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // Pagination state
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    // Refs for managing typing indicators and timeouts
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const lastMessageRef = useRef(null);

    /**
     * Scroll to bottom of messages.
     */
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    /**
     * Initialize chat by checking permissions and loading initial data.
     */
    const initializeChat = useCallback(async () => {
        if (!taskId || !authToken) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Check permissions
            const hasAccess = await canParticipateInTaskChat(taskId);
            setHasPermission(hasAccess);
            
            if (!hasAccess) {
                setError('You do not have permission to access this task chat');
                return;
            }
            
            // Load initial data
            const [messagesData, participantsData] = await Promise.all([
                getTaskMessages(taskId, 50, 0),
                getTaskChatParticipants(taskId)
            ]);
            
            setMessages(messagesData.messages || []);
            setHasMoreMessages(messagesData.has_more || false);
            setParticipants(participantsData.participants || []);
            
        } catch (err) {
            console.error('Error initializing task chat:', err);
            setError(err.message || 'Failed to initialize chat');
        } finally {
            setIsLoading(false);
        }
    }, [taskId, authToken]);

    /**
     * Connect to Socket.IO for real-time features.
     */
    const connectSocket = useCallback(async () => {
        if (!taskId || !authToken || !hasPermission) return;
        
        try {
            setConnectionStatus('connecting');
            
            // Connect to socket if not already connected
            if (!socketManager.isSocketConnected()) {
                socketManager.connect(authToken);
            }
            
            // Join task chat room
            await socketManager.joinTaskChat(taskId);
            setIsConnected(true);
            setConnectionStatus('connected');
            
        } catch (err) {
            console.error('Error connecting to task chat:', err);
            setConnectionStatus('error');
            // Don't set error here as REST API fallback is available
        }
    }, [taskId, authToken, hasPermission]);

    /**
     * Disconnect from Socket.IO.
     */
    const disconnectSocket = useCallback(() => {
        if (taskId && socketManager.isSocketConnected()) {
            socketManager.leaveTaskChat(taskId);
            setIsConnected(false);
            setConnectionStatus('disconnected');
        }
    }, [taskId]);

    /**
     * Send a message (Socket.IO or REST API fallback).
     */
    const sendMessage = useCallback(async (content) => {
        if (!content?.trim() || isSending) return;
        
        setIsSending(true);
        setError(null);
        
        try {
            if (isConnected && socketManager.isSocketConnected()) {
                // Use Socket.IO for real-time sending
                socketManager.sendTaskMessage(taskId, content);
            } else {
                // Fallback to REST API
                const newMessage = await sendTaskMessage(taskId, content);
                
                // Add message to local state immediately
                setMessages(prev => [...prev, {
                    id: newMessage.id,
                    content: content.trim(),
                    user_id: newMessage.user_id,
                    username: newMessage.username || 'You',
                    full_name: newMessage.full_name || 'You',
                    task_id: taskId,
                    created_at: newMessage.created_at
                }]);
            }
            
            setMessageInput('');
            
            // Scroll to bottom after sending
            setTimeout(scrollToBottom, 100);
            
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    }, [taskId, isConnected, isSending, scrollToBottom]);

    /**
     * Load more messages (pagination).
     */
    const loadMoreMessages = useCallback(async () => {
        if (isLoadingMore || !hasMoreMessages) return;
        
        setIsLoadingMore(true);
        
        try {
            const moreMessagesData = await getTaskMessages(taskId, 20, messages.length);
            
            setMessages(prev => [...moreMessagesData.messages, ...prev]);
            setHasMoreMessages(moreMessagesData.has_more);
            
        } catch (err) {
            console.error('Error loading more messages:', err);
            setError(err.message || 'Failed to load more messages');
        } finally {
            setIsLoadingMore(false);
        }
    }, [taskId, messages.length, isLoadingMore, hasMoreMessages]);

    /**
     * Send typing indicator (Socket.IO only).
     */
    const sendTypingIndicator = useCallback((isTyping) => {
        if (!isConnected || !socketManager.isSocketConnected()) return;
        
        if (isTyping) {
            socketManager.sendTypingStart(taskId);
            
            // Clear existing timeout and set new one
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            // Stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                socketManager.sendTypingStop(taskId);
            }, 3000);
            
        } else {
            socketManager.sendTypingStop(taskId);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        }
    }, [taskId, isConnected]);

    /**
     * Handle message input changes with typing indicators.
     */
    const handleMessageInputChange = useCallback((value) => {
        setMessageInput(value);
        
        // Send typing indicator
        if (value.trim() && !messageInput.trim()) {
            sendTypingIndicator(true);
        } else if (!value.trim() && messageInput.trim()) {
            sendTypingIndicator(false);
        }
    }, [messageInput, sendTypingIndicator]);

    // Socket.IO event handlers
    useEffect(() => {
        if (!isConnected) return;
        
        const handleNewMessage = (messageData) => {
            setMessages(prev => {
                // Avoid duplicates
                const exists = prev.some(msg => msg.id === messageData.id);
                if (exists) return prev;
                
                return [...prev, messageData];
            });
            
            // Scroll to bottom for new messages
            setTimeout(scrollToBottom, 100);
        };
        
        const handleUserTyping = (data) => {
            setTypingUsers(prev => {
                const newTypingUsers = new Set(prev);
                if (data.typing) {
                    newTypingUsers.add(data.username);
                } else {
                    newTypingUsers.delete(data.username);
                }
                return newTypingUsers;
            });
            
            // Clear typing indicator after 5 seconds
            setTimeout(() => {
                setTypingUsers(prev => {
                    const newTypingUsers = new Set(prev);
                    newTypingUsers.delete(data.username);
                    return newTypingUsers;
                });
            }, 5000);
        };
        
        const handleUserJoined = (data) => {
            console.log(`${data.username} joined the chat`);
        };
        
        const handleUserLeft = (data) => {
            console.log(`${data.username} left the chat`);
        };
        
        const handleSocketError = (error) => {
            console.error('Socket error:', error);
            setError(error.message || 'Socket connection error');
        };
        
        // Register event listeners
        socketManager.on('new_task_message', handleNewMessage);
        socketManager.on('user_typing', handleUserTyping);
        socketManager.on('user_joined_chat', handleUserJoined);
        socketManager.on('user_left_chat', handleUserLeft);
        socketManager.on('error', handleSocketError);
        
        // Cleanup on unmount or disconnect
        return () => {
            socketManager.off('new_task_message', handleNewMessage);
            socketManager.off('user_typing', handleUserTyping);
            socketManager.off('user_joined_chat', handleUserJoined);
            socketManager.off('user_left_chat', handleUserLeft);
            socketManager.off('error', handleSocketError);
        };
    }, [isConnected, scrollToBottom]);

    // Initialize chat when component mounts
    useEffect(() => {
        initializeChat();
    }, [initializeChat]);

    // Auto-connect to Socket.IO after initialization
    useEffect(() => {
        if (autoConnect && hasPermission && !isLoading) {
            connectSocket();
        }
        
        // Cleanup on unmount
        return () => {
            disconnectSocket();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [autoConnect, hasPermission, isLoading, connectSocket, disconnectSocket]);

    return {
        // Chat state
        messages,
        participants,
        isLoading,
        hasPermission,
        error,
        
        // Real-time state
        isConnected,
        connectionStatus,
        typingUsers: Array.from(typingUsers),
        
        // Message input state
        messageInput,
        isSending,
        
        // Pagination state
        hasMoreMessages,
        isLoadingMore,
        
        // Actions
        sendMessage,
        loadMoreMessages,
        connectSocket,
        disconnectSocket,
        
        // Message input handlers
        handleMessageInputChange,
        setMessageInput,
        
        // Utility refs
        messagesEndRef,
        scrollToBottom,
        
        // Utility methods
        refreshChat: initializeChat,
        clearError: () => setError(null)
    };
}; 