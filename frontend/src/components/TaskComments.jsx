import React, { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../utils/apiCalls/messageAPI';
import { projectAPI } from '../utils/apiCalls/projectAPI';
import { taskAPI } from '../utils/apiCalls/taskAPI';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, AtSign, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TaskComments = ({ taskId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [projectId, setProjectId] = useState(null);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [projectMembers, setProjectMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const textareaRef = useRef(null);
    const mentionListRef = useRef(null);

    useEffect(() => {
        if (taskId) {
            fetchTaskDetails();
        }
    }, [taskId]);

    useEffect(() => {
        if (projectId && taskId) {
            fetchComments();
            fetchProjectMembers();
        }
    }, [projectId, taskId]);

    useEffect(() => {
        if (mentionSearch !== null) {
            if (mentionSearch.trim() === '') {
                // Show all project members when @ is typed with no search
                setFilteredMembers(projectMembers);
            } else {
                // Filter project members based on search
                const filteredProjectMembers = projectMembers.filter(user =>
                    user.username?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
                    user.email?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
                    (user.full_name && user.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
                );
                setFilteredMembers(filteredProjectMembers);
            }
        } else {
            setFilteredMembers([]);
        }
    }, [mentionSearch, projectMembers]);

    const fetchTaskDetails = async () => {
        try {
            const response = await taskAPI.getTask(taskId);
            if (response.success && response.data) {
                setProjectId(response.data.project_id);
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    };

    const fetchProjectMembers = async () => {
        if (!projectId) return;

        try {
            setLoadingMembers(true);
            const members = await messageAPI.getProjectMembers(projectId);
            
            // Format members for mention functionality
            const formattedMembers = members.map(member => ({
                id: member.id,
                username: member.username || member.email?.split('@')[0] || 'user',
                email: member.email,
                full_name: member.full_name || member.username,
                profile_picture: member.profile_picture
            }));
            
            setProjectMembers(formattedMembers);
            console.log('Loaded project members:', formattedMembers);
        } catch (error) {
            console.error('Error fetching project members:', error);
            setProjectMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchComments = async (isReload = false) => {
        if (isReload) {
            setReloading(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await messageAPI.getTaskMessages(projectId, taskId);
            setComments(response || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
            setComments([]);
        } finally {
            setIsLoading(false);
            setReloading(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !projectId) return;

        try {
            setIsLoading(true);
            await messageAPI.sendTaskMessage(projectId, taskId, newComment.trim());
            setNewComment('');
            fetchComments(); // Refresh comments
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReload = () => {
        fetchComments(true);
    };

    const handleTextareaChange = (e) => {
        const value = e.target.value;
        setNewComment(value);

        // Check for @ mentions
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const mentionText = textBeforeCursor.substring(atIndex + 1);
            if (!mentionText.includes(' ') && mentionText.length <= 20) {
                setMentionSearch(mentionText);
                setShowMentions(true);

                // Calculate mention dropdown position
                const textarea = e.target;
                const textMetrics = getTextMetrics(textBeforeCursor, textarea);
                setMentionPosition({
                    top: textMetrics.height + 25,
                    left: textMetrics.width
                });

                setSelectedMentionIndex(0);
                return;
            }
        }

        setShowMentions(false);
        setMentionSearch(null);
    };

    const handleKeyDown = (e) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prev =>
                    prev < filteredMembers.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMention(filteredMembers[selectedMentionIndex]);
            } else if (e.key === 'Escape') {
                setShowMentions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
            e.preventDefault();
            handleCommentSubmit(e);
        }
    };

    const selectMention = (member) => {
        const cursorPosition = textareaRef.current.selectionStart;
        const textBeforeCursor = newComment.substring(0, cursorPosition);
        const textAfterCursor = newComment.substring(cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        const newText = textBeforeCursor.substring(0, atIndex) +
            `@${member.full_name || member.username} ` +
            textAfterCursor;

        setNewComment(newText);
        setShowMentions(false);
        setMentionSearch('');

        // Focus back to textarea
        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = atIndex + (member.full_name || member.username).length + 2;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    /**
     * Render comment content with highlighted @mentions
     */
    const renderCommentContent = (content) => {
        // Split content by @mentions and render with highlighting
        const mentionRegex = /@([a-zA-Z0-9_]+|"[^"]+"|[A-Z][a-zA-Z]*\s+[A-Z][a-zA-Z]*)/g;
        const parts = content.split(mentionRegex);
        
        return (
            <div className="text-sm break-words">
                {parts.map((part, index) => {
                    // Every odd index contains the captured mention text
                    if (index % 2 === 1) {
                        return (
                            <span 
                                key={index} 
                                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border"
                            >
                                @{part.replace(/"/g, '')}
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </div>
        );
    };

    const getUserInitials = (user) => {
        // Handle both comment objects and user objects
        const name = user.user_name || user.full_name || user.username || 'Unknown User';
        return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    };

    const getTextMetrics = (text, textarea) => {
        // Simple approximation for textarea text metrics
        const lines = text.split('\n').length;
        const avgCharWidth = 8;
        const lineHeight = 20;

        return {
            width: Math.min(text.length * avgCharWidth, textarea.offsetWidth - 20),
            height: lines * lineHeight
        };
    };

    if (!projectId) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Task Comments
                        {loadingMembers && (
                            <div className="text-xs text-muted-foreground">(Loading members...)</div>
                        )}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReload}
                        disabled={reloading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
                        {reloading ? 'Reloading...' : 'Reload'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Comments List */}
                <ScrollArea className="h-64">
                    <div className="space-y-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No comments yet. Be the first to comment!</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.profile_picture} />
                                        <AvatarFallback className="text-xs">
                                            {getUserInitials(comment)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">
                                                {comment.user_name || 'Unknown User'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {comment.created_at ?
                                                    formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) :
                                                    'Just now'
                                                }
                                            </span>
                                        </div>
                                        {renderCommentContent(comment.content)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Comment Input */}
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Write a comment... Use @ to mention team members"
                            value={newComment}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="min-h-[80px] resize-none"
                        />

                        {/* Mention Dropdown */}
                        {showMentions && filteredMembers.length > 0 && (
                            <div
                                ref={mentionListRef}
                                className="absolute z-50 w-64 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1"
                                style={{
                                    top: mentionPosition.top,
                                    left: Math.min(mentionPosition.left, 200) // Prevent overflow
                                }}
                            >
                                {filteredMembers.map((member, index) => (
                                    <div
                                        key={`${member.id}-${member.username}`}
                                        className={`px-3 py-2 cursor-pointer hover:bg-accent ${index === selectedMentionIndex ? 'bg-accent' : ''
                                            }`}
                                        onClick={() => selectMention(member)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.profile_picture} />
                                                <AvatarFallback className="text-xs">
                                                    {getUserInitials(member)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium">
                                                    {member.full_name || member.username}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    @{member.username}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AtSign className="h-3 w-3" />
                            <span>Use @ to mention team members</span>
                            {projectMembers.length > 0 && (
                                <span>({projectMembers.length} members loaded)</span>
                            )}
                        </div>
                        <Button type="submit" disabled={!newComment.trim() || isLoading} size="sm">
                            <Send className="h-4 w-4 mr-2" />
                            {isLoading ? 'Posting...' : 'Comment'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default TaskComments;
