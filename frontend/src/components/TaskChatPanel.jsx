/**
 * TaskChatPanel component for real-time task communication.
 * 
 * Provides seamless in-task messaging with Socket.IO integration,
 * typing indicators, user presence, and message history.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTaskChat } from '../hooks/useTaskChat';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Loader2,
  ChevronDown,
  MoreVertical,
  Paperclip
} from 'lucide-react';
import './TaskChatPanel.css';

/**
 * TaskChatPanel component for task-specific real-time communication.
 * 
 * @param {number} taskId - ID of the task for chat
 * @param {string} authToken - Authentication token for user
 * @param {boolean} isCollapsed - Whether chat panel is initially collapsed
 * @param {function} onToggleCollapse - Callback for collapse/expand toggle
 */
const TaskChatPanel = ({ 
  taskId, 
  authToken, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  const [showParticipants, setShowParticipants] = useState(false);
  const messageInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const {
    // Chat state
    messages,
    participants,
    isLoading,
    hasPermission,
    error,
    
    // Real-time state
    isConnected,
    connectionStatus,
    typingUsers,
    
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
    
    // Utilities
    messagesEndRef,
    scrollToBottom,
    refreshChat,
    clearError
  } = useTaskChat(taskId, authToken);

  // Handle collapse/expand
  const handleToggleCollapse = () => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsed);
    }
  };

  // Handle message submission
  const handleSubmitMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && !isSending) {
      sendMessage(messageInput);
    }
  };

  // Handle Enter key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitMessage(e);
    }
  };

  // Auto-focus message input when expanding
  useEffect(() => {
    if (!localCollapsed && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [localCollapsed]);

  // Format timestamp for messages
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  // Get connection status display
  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: Wifi, text: 'Connected', className: 'connected' };
      case 'connecting':
        return { icon: Loader2, text: 'Connecting...', className: 'connecting' };
      case 'error':
        return { icon: WifiOff, text: 'Connection Error', className: 'error' };
      default:
        return { icon: WifiOff, text: 'Offline', className: 'offline' };
    }
  };

  const connectionStatusInfo = getConnectionStatusDisplay();

  if (!hasPermission) {
    return (
      <div className="task-chat-panel task-chat-error">
        <div className="task-chat-header">
          <div className="task-chat-title">
            <MessageSquare className="task-chat-icon" />
            <span>Task Chat</span>
          </div>
        </div>
        <div className="task-chat-no-permission">
          <AlertCircle className="task-chat-error-icon" />
          <p>You don't have permission to access this task chat.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="task-chat-panel task-chat-loading">
        <div className="task-chat-header">
          <div className="task-chat-title">
            <MessageSquare className="task-chat-icon" />
            <span>Task Chat</span>
          </div>
        </div>
        <div className="task-chat-loading-content">
          <Loader2 className="task-chat-loading-spinner" />
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-chat-panel ${localCollapsed ? 'collapsed' : 'expanded'}`}>
      {/* Chat Header */}
      <div className="task-chat-header" onClick={handleToggleCollapse}>
        <div className="task-chat-title">
          <MessageSquare className="task-chat-icon" />
          <span>Task Chat</span>
          <span className="task-chat-message-count">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        
        <div className="task-chat-header-actions">
          {/* Connection Status */}
          <div className={`task-chat-connection-status ${connectionStatusInfo.className}`}>
            <connectionStatusInfo.icon 
              className={`task-chat-connection-icon ${connectionStatus === 'connecting' ? 'spinning' : ''}`} 
            />
            <span className="task-chat-connection-text">{connectionStatusInfo.text}</span>
          </div>
          
          {/* Participants Toggle */}
          <button
            className="task-chat-participants-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowParticipants(!showParticipants);
            }}
            title="View participants"
          >
            <Users className="task-chat-participants-icon" />
            <span>{participants.length}</span>
          </button>
          
          {/* Collapse/Expand Button */}
          <button className="task-chat-collapse-btn">
            <ChevronDown 
              className={`task-chat-collapse-icon ${localCollapsed ? 'collapsed' : ''}`} 
            />
          </button>
        </div>
      </div>

      {/* Participants List (when shown) */}
      {showParticipants && !localCollapsed && (
        <div className="task-chat-participants">
          <h4 className="task-chat-participants-title">Participants ({participants.length})</h4>
          <div className="task-chat-participants-list">
            {participants.map((participant) => (
              <div key={participant.id} className="task-chat-participant">
                <div className="task-chat-participant-avatar">
                  {participant.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="task-chat-participant-info">
                  <span className="task-chat-participant-name">{participant.full_name}</span>
                  {participant.is_task_owner && (
                    <span className="task-chat-participant-badge">Task Owner</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Content */}
      {!localCollapsed && (
        <div className="task-chat-content">
          {error && (
            <div className="task-chat-error-banner">
              <AlertCircle className="task-chat-error-icon" />
              <span>{error}</span>
              <button onClick={clearError} className="task-chat-error-close">×</button>
            </div>
          )}

          {/* Messages Area */}
          <div className="task-chat-messages" ref={chatContainerRef}>
            {/* Load More Messages Button */}
            {hasMoreMessages && (
              <div className="task-chat-load-more">
                <button
                  onClick={loadMoreMessages}
                  disabled={isLoadingMore}
                  className="task-chat-load-more-btn"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="task-chat-loading-spinner" />
                      Loading...
                    </>
                  ) : (
                    'Load More Messages'
                  )}
                </button>
              </div>
            )}

            {/* Messages List */}
            <div className="task-chat-messages-list">
              {messages.length === 0 ? (
                <div className="task-chat-empty-state">
                  <MessageSquare className="task-chat-empty-icon" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isCurrentUser = message.user_id === parseInt(authToken?.split('.')[1] || '0');
                  const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`task-chat-message ${isCurrentUser ? 'own-message' : 'other-message'}`}
                    >
                      {!isCurrentUser && showAvatar && (
                        <div className="task-chat-message-avatar">
                          {message.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="task-chat-message-content">
                        {!isCurrentUser && showAvatar && (
                          <div className="task-chat-message-header">
                            <span className="task-chat-message-author">{message.full_name}</span>
                            <span className="task-chat-message-time">
                              {formatMessageTime(message.created_at)}
                            </span>
                          </div>
                        )}
                        <div className="task-chat-message-bubble">
                          <p className="task-chat-message-text">{message.content}</p>
                          {isCurrentUser && (
                            <span className="task-chat-message-time own-time">
                              {formatMessageTime(message.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="task-chat-typing">
                <div className="task-chat-typing-indicator">
                  <div className="task-chat-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="task-chat-typing-text">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.join(', ')} are typing...`
                    }
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSubmitMessage} className="task-chat-input-form">
            <div className="task-chat-input-container">
              <div className="task-chat-input-wrapper">
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="task-chat-input"
                  rows={1}
                  disabled={isSending}
                />
                <button
                  type="button"
                  className="task-chat-attachment-btn"
                  title="Add attachment"
                >
                  <Paperclip className="task-chat-attachment-icon" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!messageInput.trim() || isSending}
                className="task-chat-send-btn"
              >
                {isSending ? (
                  <Loader2 className="task-chat-send-icon spinning" />
                ) : (
                  <Send className="task-chat-send-icon" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskChatPanel; 