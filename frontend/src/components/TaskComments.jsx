import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, AtSign, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TaskComments = ({ taskId, projectId, currentUser, projectMembers = [] }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const textareaRef = useRef(null);
    const mentionListRef = useRef(null);

    useEffect(() => {
        fetchComments();
    }, [taskId]);

    useEffect(() => {
        if (mentionSearch) {
            searchProjectMembers(mentionSearch);
        } else {
            setFilteredMembers([]);
        }
    }, [mentionSearch, projectId]);

    const searchProjectMembers = async (query) => {
        if (!query.trim()) {
            setFilteredMembers([]);
            return;
        }

        try {
            setIsSearchingMembers(true);
            // Use the project member search API directly
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/projects/${projectId}/members/search?q=${encodeURIComponent(query)}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setFilteredMembers(data.members || []);
                setSelectedMentionIndex(0);
            } else {
                setFilteredMembers([]);
            }
        } catch (error) {
            console.error('Error searching project members:', error);
            setFilteredMembers([]);
        } finally {
            setIsSearchingMembers(false);
        }
    };

    const fetchComments = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newComment
                })
            });

            if (response.ok) {
                setNewComment('');
                await fetchComments();
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextareaChange = (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;

        setNewComment(value);
        // Check for @ mention
        const beforeCursor = value.slice(0, cursorPosition);
        const atIndex = beforeCursor.lastIndexOf('@');
        // console.log(atIndex,beforeCursor);

        if (atIndex !== -1) {
            const afterAt = beforeCursor.slice(atIndex + 1);

            // Allow mention dropdown even if afterAt is empty (just typed @)
            if (
                !afterAt.includes(' ') &&
                !afterAt.includes('\n')
            ) {
                setMentionSearch(afterAt);
                setShowMentions(true);

                const textarea = textareaRef.current;
                if (textarea) {
                    const rect = textarea.getBoundingClientRect();
                    const lineHeight = 20;
                    const lines = beforeCursor.split('\n').length - 1;

                    setMentionPosition({
                        top: rect.top + (lines * lineHeight) + 25,
                        left: rect.left + 10
                    });
                }
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleKeyDown = (e) => {
        if (showMentions && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prev =>
                    prev < filteredMembers.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prev =>
                    prev > 0 ? prev - 1 : filteredMembers.length - 1
                );
            } else if (e.key === 'Enter' && !e.shiftKey) {
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
        const beforeCursor = newComment.slice(0, cursorPosition);
        const afterCursor = newComment.slice(cursorPosition);
        const atIndex = beforeCursor.lastIndexOf('@');

        const beforeAt = beforeCursor.slice(0, atIndex);
        const mentionText = `@${member.username}`;
        const newText = beforeAt + mentionText + ' ' + afterCursor;

        setNewComment(newText);
        setShowMentions(false);
        setMentionSearch('');

        // Focus back to textarea
        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = beforeAt.length + mentionText.length + 1;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const renderCommentContent = (content) => {
        // Simple mention highlighting - replace @username with styled spans
        const mentionRegex = /@(\w+)/g;
        const parts = content.split(mentionRegex);

        return parts.map((part, index) => {
            if (index % 2 === 1) {
                // This is a username
                const member = projectMembers.find(m => m.username === part);
                return (
                    <Badge key={index} variant="secondary" className="mx-1">
                        @{part}
                    </Badge>
                );
            }
            return part;
        });
    };

    const getUserInitials = (user) => {
        if (user.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        }
        return user.username?.[0]?.toUpperCase() || 'U';
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Comments ({comments.length})
                </CardTitle>
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
                                        <AvatarImage src={comment.user?.profile_picture} />
                                        <AvatarFallback className="text-xs">
                                            {getUserInitials(comment.user || { username: 'Unknown' })}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">
                                                {comment.user?.full_name || comment.user?.username || 'Unknown User'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {comment.created_at ?
                                                    formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) :
                                                    'Just now'
                                                }
                                            </span>
                                        </div>
                                        <div className="text-sm break-words">
                                            {renderCommentContent(comment.content)}
                                        </div>
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
                                className="fixed z-50 w-64 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto"
                                style={{
                                    top: mentionPosition.top,
                                    left: mentionPosition.left
                                }}
                            >
                                {filteredMembers.map((member, index) => (
                                    <div
                                        key={member.id}
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
