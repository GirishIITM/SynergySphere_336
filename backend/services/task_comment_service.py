"""
Task Comment Service for real-time messaging functionality.

This service handles task-specific comments with real-time Socket.IO integration,
allowing seamless communication within tasks.
"""

from typing import List, Dict, Optional
from datetime import datetime
from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_socketio import emit, join_room, leave_room

from extensions import db, socketio
from models.message import Message
from models.task import Task
from models.user import User
from utils.datetime_utils import get_utc_now


class TaskCommentService:
    """Service for managing real-time task comments and Socket.IO rooms."""

    @staticmethod
    def get_task_comments(task_id: int, limit: int = 50) -> List[Dict]:
        """
        Get comments for a specific task.

        Args:
            task_id (int): The ID of the task.
            limit (int): Maximum number of comments to retrieve.

        Returns:
            List[Dict]: List of comment dictionaries.
        """
        try:
            # Verify task exists and user has access
            task = Task.query.get_or_404(task_id)
            
            comments = (Message.query
                       .filter_by(task_id=task_id)
                       .order_by(Message.created_at.desc())
                       .limit(limit)
                       .all())
            
            return [comment.to_dict() for comment in reversed(comments)]
        except Exception as e:
            raise Exception(f"Failed to get task comments: {str(e)}")

    @staticmethod
    def create_task_comment(task_id: int, user_id: int, content: str) -> Dict:
        """
        Create a new comment for a task.

        Args:
            task_id (int): The ID of the task.
            user_id (int): The ID of the user creating the comment.
            content (str): The comment content.

        Returns:
            Dict: The created comment dictionary.
        """
        try:
            # Verify task exists
            task = Task.query.get_or_404(task_id)
            
            # Create new comment
            comment = Message(
                content=content.strip(),
                user_id=user_id,
                project_id=task.project_id,
                task_id=task_id,
                created_at=get_utc_now()
            )
            
            db.session.add(comment)
            db.session.commit()
            
            # Emit to all users in the task room
            comment_dict = comment.to_dict()
            socketio.emit('new_task_comment', comment_dict, room=f'task_{task_id}')
            
            return comment_dict
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create task comment: {str(e)}")

    @staticmethod
    def get_task_room_name(task_id: int) -> str:
        """
        Get the Socket.IO room name for a task.

        Args:
            task_id (int): The ID of the task.

        Returns:
            str: The room name.
        """
        return f'task_{task_id}'

    @staticmethod
    def user_can_access_task(user_id: int, task_id: int) -> bool:
        """
        Check if user can access a task (for Socket.IO room authorization).

        Args:
            user_id (int): The ID of the user.
            task_id (int): The ID of the task.

        Returns:
            bool: True if user can access the task, False otherwise.
        """
        try:
            task = Task.query.get(task_id)
            if not task:
                return False
            
            # Check if user is project member or task owner
            from models.project import ProjectMember
            
            is_member = (ProjectMember.query
                        .filter_by(user_id=user_id, project_id=task.project_id)
                        .first() is not None)
            
            is_owner = task.owner_id == user_id
            
            return is_member or is_owner
        except Exception:
            return False


# Socket.IO Event Handlers
@socketio.on('join_task_room')
@jwt_required()
def handle_join_task_room(data):
    """
    Handle user joining a task comment room.

    Args:
        data (dict): Contains 'task_id' for the task to join.
    """
    try:
        user_id = get_jwt_identity()
        task_id = data.get('task_id')
        
        if not task_id:
            emit('error', {'message': 'Task ID required'})
            return
        
        # Check if user can access this task
        if not TaskCommentService.user_can_access_task(user_id, task_id):
            emit('error', {'message': 'Access denied to this task'})
            return
        
        room_name = TaskCommentService.get_task_room_name(task_id)
        join_room(room_name)
        
        # Send recent comments to the user
        try:
            comments = TaskCommentService.get_task_comments(task_id)
            emit('task_comments_history', {'comments': comments})
        except Exception as e:
            emit('error', {'message': f'Failed to load comments: {str(e)}'})
        
        # Notify room about user joining
        user = User.query.get(user_id)
        username = user.username if user else 'Unknown User'
        emit('user_joined_task', {
            'message': f'{username} joined the task discussion',
            'user_id': user_id,
            'task_id': task_id
        }, room=room_name, include_self=False)
        
    except Exception as e:
        emit('error', {'message': f'Failed to join task room: {str(e)}'})


@socketio.on('leave_task_room')
@jwt_required()
def handle_leave_task_room(data):
    """
    Handle user leaving a task comment room.

    Args:
        data (dict): Contains 'task_id' for the task to leave.
    """
    try:
        user_id = get_jwt_identity()
        task_id = data.get('task_id')
        
        if not task_id:
            return
        
        room_name = TaskCommentService.get_task_room_name(task_id)
        leave_room(room_name)
        
        # Notify room about user leaving
        user = User.query.get(user_id)
        username = user.username if user else 'Unknown User'
        emit('user_left_task', {
            'message': f'{username} left the task discussion',
            'user_id': user_id,
            'task_id': task_id
        }, room=room_name)
        
    except Exception as e:
        emit('error', {'message': f'Failed to leave task room: {str(e)}'})


@socketio.on('send_task_comment')
@jwt_required()
def handle_send_task_comment(data):
    """
    Handle sending a new task comment.

    Args:
        data (dict): Contains 'task_id' and 'content' for the comment.
    """
    try:
        user_id = get_jwt_identity()
        task_id = data.get('task_id')
        content = data.get('content', '').strip()
        
        if not task_id or not content:
            emit('error', {'message': 'Task ID and content are required'})
            return
        
        # Check if user can access this task
        if not TaskCommentService.user_can_access_task(user_id, task_id):
            emit('error', {'message': 'Access denied to this task'})
            return
        
        # Create the comment
        comment_dict = TaskCommentService.create_task_comment(task_id, user_id, content)
        
        # Emit confirmation to sender
        emit('comment_sent', {'comment': comment_dict})
        
    except Exception as e:
        emit('error', {'message': f'Failed to send comment: {str(e)}'})


@socketio.on('connect')
@jwt_required()
def handle_connect():
    """Handle Socket.IO connection."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        username = user.username if user else 'Unknown User'
        
        print(f'User {username} (ID: {user_id}) connected to Socket.IO')
        emit('connected', {'message': 'Successfully connected to task comments'})
        
    except Exception as e:
        print(f'Connection error: {str(e)}')
        emit('error', {'message': 'Connection failed'})


@socketio.on('disconnect')
@jwt_required()
def handle_disconnect():
    """Handle Socket.IO disconnection."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        username = user.username if user else 'Unknown User'
        
        print(f'User {username} (ID: {user_id}) disconnected from Socket.IO')
        
    except Exception as e:
        print(f'Disconnection error: {str(e)}') 